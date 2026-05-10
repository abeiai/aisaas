import json
import time
import urllib.error
import urllib.request
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from starlette.responses import StreamingResponse

app = FastAPI(title="AI SaaS AI Gateway", version="0.0.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"service": "ai-gateway", "status": "ok"}


class ChatMessage(BaseModel):
    role: str = Field(min_length=1, max_length=30)
    content: str = Field(min_length=1, max_length=8000)


class Usage(BaseModel):
    inputTokens: int | None = None
    outputTokens: int | None = None
    totalTokens: int | None = None


class TextGenerateRequest(BaseModel):
    scenarioSlug: str | None = None
    baseUrl: str | None = None
    apiKey: str | None = None
    modelName: str | None = None
    messages: list[ChatMessage] | None = None
    prompt: str = Field(min_length=1, max_length=8000)
    input: str = Field(min_length=1, max_length=2000)
    temperature: float = 0.7
    maxTokens: int = 800


class TextGenerateResponse(BaseModel):
    output: str
    text: str
    usage: Usage | None = None
    usageCredits: int | None = None
    provider: str
    model: str
    finishReason: str | None = None
    errorCode: str | None = None
    requestId: str | None = None
    latencyMs: int


@app.post("/v1/text/generate")
def generate_text(payload: TextGenerateRequest) -> TextGenerateResponse:
    if not payload.baseUrl or not payload.apiKey or not payload.modelName:
        return mock_generate(payload)

    started_at = time.monotonic()
    response, request_id = call_openai_compatible(payload)
    output = extract_output(response)

    if not output:
        raise provider_error("EMPTY_OUTPUT", "AI Provider 返回内容为空")

    usage = response.get("usage") if isinstance(response.get("usage"), dict) else {}
    finish_reason = extract_finish_reason(response)

    return TextGenerateResponse(
        output=output,
        text=output,
        usage=Usage(
            inputTokens=int_value(usage.get("prompt_tokens")),
            outputTokens=int_value(usage.get("completion_tokens")),
            totalTokens=int_value(usage.get("total_tokens")),
        ),
        usageCredits=None,
        provider=provider_name(payload.baseUrl),
        model=payload.modelName,
        finishReason=finish_reason,
        errorCode=None,
        requestId=request_id,
        latencyMs=round((time.monotonic() - started_at) * 1000),
    )


@app.post("/v1/text/stream")
def stream_text(payload: TextGenerateRequest) -> StreamingResponse:
    def event_stream():
        try:
            result = generate_text(payload)

            for index in range(0, len(result.text), 8):
                chunk = result.text[index : index + 8]
                yield sse_event({"text": chunk, "done": False})
                time.sleep(0.01)

            yield sse_event(
                {
                    "text": "",
                    "done": True,
                    "usage": result.usage.dict() if result.usage else None,
                    "usageCredits": result.usageCredits,
                    "provider": result.provider,
                    "model": result.model,
                    "finishReason": result.finishReason,
                    "requestId": result.requestId,
                }
            )
        except HTTPException as error:
            detail = error.detail if isinstance(error.detail, dict) else {}
            yield sse_event(
                {
                    "done": True,
                    "errorCode": detail.get("errorCode") or "STREAM_FAILED",
                    "errorMessage": detail.get("errorMessage") or "AI 流式生成失败",
                }
            )

    return StreamingResponse(event_stream(), media_type="text/event-stream")


def call_openai_compatible(payload: TextGenerateRequest) -> tuple[dict[str, Any], str | None]:
    endpoint = chat_completions_url(payload.baseUrl or "")
    request_body = {
        "model": payload.modelName,
        "messages": [message.dict() for message in payload.messages] if payload.messages else [
            {"role": "user", "content": payload.prompt}
        ],
        "temperature": payload.temperature,
        "max_tokens": payload.maxTokens,
    }
    request = urllib.request.Request(
        endpoint,
        data=json.dumps(request_body, ensure_ascii=False).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {payload.apiKey}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            body = response.read().decode("utf-8")
            request_id = response.headers.get("x-request-id") or response.headers.get("x-request-id".title())
    except urllib.error.HTTPError as error:
        detail = safe_json(error.read().decode("utf-8", errors="ignore"))
        raise provider_error(
            provider_error_code(detail, error.code),
            provider_error_message(detail, error.code),
        ) from error
    except TimeoutError as error:
        raise provider_error("PROVIDER_TIMEOUT", "AI Provider 请求超时") from error
    except OSError as error:
        raise provider_error("PROVIDER_NETWORK_ERROR", "AI Provider 网络请求失败") from error

    parsed = safe_json(body)

    if not isinstance(parsed, dict):
        raise provider_error("INVALID_PROVIDER_RESPONSE", "AI Provider 返回格式不正确")

    return parsed, request_id


def mock_generate(payload: TextGenerateRequest) -> TextGenerateResponse:
    user_input = payload.input.strip()

    if "触发失败" in user_input or "fail" in user_input.lower():
        raise provider_error("MOCK_FAILED", "模拟生成失败")

    usage_credits = min(120, max(20, len(user_input) // 6 + 28))
    text = "\n".join(
        [
            f"主题：{user_input}",
            "",
            "这是一版面向简体中文用户的运营文案草稿，适合用于工具站首页、活动页或内容导流入口。",
            "",
            "推荐文案：",
            f"用「{user_input}」帮助用户更快完成内容构思、结构整理和表达优化。",
            "先强调具体场景，再说明能节省的时间和降低的操作门槛，最后引导用户进入工具体验。",
        ]
    )

    return TextGenerateResponse(
        output=text,
        text=text,
        usage=None,
        usageCredits=usage_credits,
        provider="mock",
        model="mock-copywriting",
        finishReason="stop",
        errorCode=None,
        requestId=None,
        latencyMs=0,
    )


def chat_completions_url(base_url: str) -> str:
    normalized = base_url.strip().rstrip("/")

    if normalized.endswith("/chat/completions"):
        return normalized

    return f"{normalized}/chat/completions"


def extract_output(response: dict[str, Any]) -> str:
    choices = response.get("choices")

    if not isinstance(choices, list) or not choices:
        return ""

    first_choice = choices[0]

    if not isinstance(first_choice, dict):
        return ""

    message = first_choice.get("message")

    if isinstance(message, dict) and isinstance(message.get("content"), str):
        return message["content"].strip()

    if isinstance(first_choice.get("text"), str):
        return first_choice["text"].strip()

    return ""


def extract_finish_reason(response: dict[str, Any]) -> str | None:
    choices = response.get("choices")

    if isinstance(choices, list) and choices and isinstance(choices[0], dict):
        finish_reason = choices[0].get("finish_reason")
        return finish_reason if isinstance(finish_reason, str) else None

    return None


def safe_json(value: str) -> Any:
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return None


def provider_error_code(detail: Any, status_code: int) -> str:
    if isinstance(detail, dict):
        error = detail.get("error")
        if isinstance(error, dict) and isinstance(error.get("code"), str):
            return error["code"]

    return f"PROVIDER_HTTP_{status_code}"


def provider_error_message(detail: Any, status_code: int) -> str:
    if isinstance(detail, dict):
        error = detail.get("error")
        if isinstance(error, dict) and isinstance(error.get("message"), str):
            return error["message"]

    return f"AI Provider 请求失败：HTTP {status_code}"


def provider_error(error_code: str, message: str) -> HTTPException:
    return HTTPException(
        status_code=502,
        detail={
            "errorCode": error_code,
            "errorMessage": message,
        },
    )


def sse_event(payload: dict[str, Any]) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def provider_name(base_url: str) -> str:
    normalized = base_url.replace("https://", "").replace("http://", "").strip("/")
    return normalized.split("/")[0] or "openai-compatible"


def int_value(value: Any) -> int | None:
    return int(value) if isinstance(value, (int, float)) and value > 0 else None
