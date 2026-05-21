from __future__ import annotations

import base64
import json
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any


class DashScopeAudioError(Exception):
    def __init__(self, error_code: str, message: str, status_code: int = 502):
        super().__init__(message)
        self.error_code = error_code
        self.message = message
        self.status_code = status_code


@dataclass(frozen=True)
class DashScopeAudioConfig:
    base_url: str
    web_socket_url: str | None
    api_key: str
    region: str | None = None
    timeout_seconds: int = 45


class DashScopeAudioAdapter:
    def __init__(self, config: DashScopeAudioConfig):
        self.config = config

    def test_connection(self, model: str) -> dict[str, Any]:
        if not self.config.api_key.strip():
            raise DashScopeAudioError("DASHSCOPE_API_KEY_MISSING", "DASHSCOPE_API_KEY 未配置", 400)

        if supports_system_voice(model):
            self.synthesize_speech(
                model=model,
                voice="longanyang",
                text="连接测试",
                format="mp3",
                sample_rate=24000,
            )
        else:
            self.list_voices(prefix="_aisaas_connection_test_", page_size=1)

        return {
            "success": True,
            "message": "连接成功",
            "provider": "aliyun_dashscope_audio",
            "model": model,
        }

    def create_cloned_voice(
        self,
        *,
        target_model: str,
        source_audio_url: str,
        name: str,
        prefix: str | None = None,
    ) -> dict[str, Any]:
        payload = {
            "model": "voice-enrollment",
            "input": {
                "action": "create_voice",
                "target_model": target_model,
                "audio_url": source_audio_url,
                "prefix": prefix or normalized_prefix(name),
            },
        }
        return self._post_json(customization_path(), payload)

    def create_designed_voice(
        self,
        *,
        target_model: str,
        voice_prompt: str,
        name: str,
        preview_text: str | None = None,
    ) -> dict[str, Any]:
        payload = {
            "model": "voice-enrollment",
            "input": {
                "action": "create_voice_by_prompt",
                "target_model": target_model,
                "voice_prompt": voice_prompt,
                "prefix": normalized_prefix(name),
                "preview_text": preview_text,
            },
        }
        return self._post_json(customization_path(), payload)

    def query_voice(self, provider_voice_id: str) -> dict[str, Any]:
        payload = {
            "model": "voice-enrollment",
            "input": {
                "action": "query_voices",
                "voice_id": provider_voice_id,
            },
        }
        return self._post_json(customization_path(), payload)

    def delete_voice(self, provider_voice_id: str) -> dict[str, Any]:
        payload = {
            "model": "voice-enrollment",
            "input": {
                "action": "delete_voice",
                "voice_id": provider_voice_id,
            },
        }
        return self._post_json(customization_path(), payload)

    def list_voices(self, *, prefix: str | None = None, page_size: int = 1) -> dict[str, Any]:
        payload = {
            "model": "voice-enrollment",
            "input": {
                "action": "list_voices",
                "page_size": page_size,
            },
        }

        if prefix:
            payload["input"]["prefix"] = prefix

        return self._post_json(customization_path(), payload)

    def synthesize_speech(
        self,
        *,
        model: str,
        voice: str,
        text: str,
        format: str = "mp3",
        sample_rate: int | None = None,
        speed: float | None = None,
        pitch: float | None = None,
        volume: float | None = None,
    ) -> dict[str, Any]:
        started_at = time.monotonic()
        payload: dict[str, Any] = {
            "model": model,
            "input": {
                "text": text,
                "voice": voice,
            },
            "parameters": {
                "format": format,
            },
        }

        if sample_rate:
            payload["parameters"]["sample_rate"] = sample_rate
        if speed is not None:
            payload["parameters"]["rate"] = speed
        if pitch is not None and pitch != 0:
            payload["parameters"]["pitch"] = pitch
        if volume is not None:
            payload["parameters"]["volume"] = normalized_volume(volume)

        response = self._post_json("/services/audio/tts/SpeechSynthesizer", payload)
        audio_url = nested_string(response, ["output", "audio", "url"]) or nested_string(response, ["output", "url"])
        audio_data = nested_string(response, ["output", "audio", "data"]) or nested_string(response, ["output", "data"])
        usage = response.get("usage") if isinstance(response.get("usage"), dict) else {}

        return {
            "provider": "aliyun_dashscope_audio",
            "model": model,
            "voice": voice,
            "audioUrl": audio_url,
            "audioBase64": audio_data,
            "usage": {
                "inputCharacters": len(text),
                "providerUsage": usage,
            },
            "requestId": request_id_from_response(response),
            "latencyMs": round((time.monotonic() - started_at) * 1000),
            "raw": response,
        }

    def stream_synthesize_speech(self, **kwargs: Any) -> dict[str, Any]:
        # 阶段 21 先以统一接口保留流式入口；后续前台接入时再补充 WebSocket 音频帧透传。
        return self.synthesize_speech(**kwargs)

    def _post_json(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        return self._request_json("POST", path, payload)

    def _request_json(self, method: str, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        endpoint = f"{self.config.base_url.rstrip('/')}/{path.lstrip('/')}"
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8") if payload is not None else None
        request = urllib.request.Request(
            endpoint,
            data=data,
            headers={
                "Authorization": f"Bearer {self.config.api_key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            method=method,
        )

        try:
            with urllib.request.urlopen(request, timeout=self.config.timeout_seconds) as response:
                body = response.read()
                parsed = safe_json(body.decode("utf-8", errors="ignore"))
                if not isinstance(parsed, dict):
                    if response.headers.get("content-type", "").startswith("audio/"):
                        parsed = {
                            "output": {
                                "audio": {
                                    "data": base64.b64encode(body).decode("ascii")
                                }
                            }
                        }
                    else:
                        raise DashScopeAudioError("INVALID_PROVIDER_RESPONSE", "阿里云语音接口返回格式不正确")

                request_id = response.headers.get("x-request-id") or response.headers.get("X-Request-Id")
                if request_id and "request_id" not in parsed:
                    parsed["request_id"] = request_id
                return parsed
        except urllib.error.HTTPError as error:
            detail = safe_json(error.read().decode("utf-8", errors="ignore"))
            raise DashScopeAudioError(
                provider_error_code(detail, error.code),
                provider_error_message(detail, error.code),
                error.code,
            ) from error
        except TimeoutError as error:
            raise DashScopeAudioError("PROVIDER_TIMEOUT", "阿里云语音接口请求超时") from error
        except OSError as error:
            raise DashScopeAudioError("PROVIDER_NETWORK_ERROR", "阿里云语音接口网络请求失败") from error


def safe_json(value: str) -> Any:
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return None


def provider_error_code(detail: Any, status_code: int) -> str:
    if isinstance(detail, dict):
        code = detail.get("code") or detail.get("error_code")
        if isinstance(code, str):
            return code
        error = detail.get("error")
        if isinstance(error, dict) and isinstance(error.get("code"), str):
            return error["code"]

    if status_code in (401, 403):
        return "DASHSCOPE_AUTH_FAILED"
    if status_code == 404:
        return "DASHSCOPE_RESOURCE_NOT_FOUND"
    return f"DASHSCOPE_HTTP_{status_code}"


def provider_error_message(detail: Any, status_code: int) -> str:
    if status_code in (401, 403):
        return "DASHSCOPE_API_KEY 无效或权限不足"

    if isinstance(detail, dict):
        message = detail.get("message") or detail.get("error_message")
        if isinstance(message, str) and message.strip():
            return message.strip()
        error = detail.get("error")
        if isinstance(error, dict) and isinstance(error.get("message"), str):
            return error["message"]

    if status_code == 404:
        return "阿里云语音资源不存在"
    return f"阿里云语音接口请求失败：HTTP {status_code}"


def customization_path() -> str:
    return "/services/audio/tts/customization"


def supports_system_voice(model: str) -> bool:
    normalized = model.strip().lower()

    return normalized in {"cosyvoice-v3-flash", "cosyvoice-v3-plus", "cosyvoice-v2", "cosyvoice-v1", "sambert"}


def normalized_volume(value: float) -> int | float:
    if 0 <= value <= 2:
        return round(value * 50)
    return value


def normalized_prefix(value: str) -> str:
    prefix = "".join(character.lower() for character in value if character.isascii() and character.isalnum())[:12]
    return prefix or "voice"


def nested_string(value: dict[str, Any], path: list[str]) -> str | None:
    current: Any = value
    for key in path:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
    return current if isinstance(current, str) and current.strip() else None


def request_id_from_response(value: dict[str, Any]) -> str | None:
    request_id = value.get("request_id") or value.get("requestId")
    return request_id if isinstance(request_id, str) else None
