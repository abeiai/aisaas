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

    def transcribe_audio(
        self,
        *,
        model: str,
        audio_url: str,
        language_hints: list[str] | None = None,
        timestamp_alignment_enabled: bool = True,
    ) -> dict[str, Any]:
        started_at = time.monotonic()
        payload: dict[str, Any] = {
            "model": model,
            "input": {
                "file_urls": [audio_url],
            },
            "parameters": {
                "timestamp_alignment_enabled": timestamp_alignment_enabled,
            },
        }

        if language_hints:
            payload["parameters"]["language_hints"] = language_hints

        response = self._post_json(
            "/services/audio/asr/transcription",
            payload,
            extra_headers={"X-DashScope-Async": "enable"},
        )
        task_id = (
            nested_string(response, ["output", "task_id"])
            or nested_string(response, ["output", "taskId"])
            or nested_string(response, ["task_id"])
        )
        task_response = self._poll_transcription_task(task_id) if task_id else response
        transcript_payloads = [task_response, *self._download_transcription_payloads(task_response)]
        sentences = normalize_transcription_sentences(transcript_payloads)

        if not sentences:
            raise DashScopeAudioError(
                "ASR_SUBTITLE_EMPTY",
                "阿里云语音识别未返回带时间轴的字幕，请确认模型支持时间戳并检查音频 URL 是否可公网访问",
            )

        subtitle_text = srt_from_sentences(sentences)
        duration_ms = max((sentence["endTimeMs"] for sentence in sentences), default=0)

        return {
            "provider": "aliyun_dashscope_audio",
            "model": model,
            "audioUrl": audio_url,
            "subtitleText": subtitle_text,
            "durationMs": duration_ms,
            "sentences": sentences,
            "usage": task_response.get("usage") if isinstance(task_response.get("usage"), dict) else {},
            "taskId": task_id,
            "requestId": request_id_from_response(task_response) or request_id_from_response(response),
            "latencyMs": round((time.monotonic() - started_at) * 1000),
            "raw": task_response,
        }

    def stream_synthesize_speech(self, **kwargs: Any) -> dict[str, Any]:
        # 阶段 21 先以统一接口保留流式入口；后续前台接入时再补充 WebSocket 音频帧透传。
        return self.synthesize_speech(**kwargs)

    def _poll_transcription_task(self, task_id: str | None) -> dict[str, Any]:
        if not task_id:
            raise DashScopeAudioError("ASR_TASK_ID_MISSING", "阿里云语音识别未返回任务 ID")

        deadline = time.monotonic() + max(self.config.timeout_seconds, 30)
        last_response: dict[str, Any] | None = None

        while time.monotonic() < deadline:
            response = self._query_task(task_id)
            last_response = response
            status = (
                nested_string(response, ["output", "task_status"])
                or nested_string(response, ["output", "status"])
                or nested_string(response, ["status"])
                or ""
            ).upper()

            if status in {"SUCCEEDED", "SUCCESS", "COMPLETED"}:
                return response

            if status in {"FAILED", "FAILURE", "CANCELED", "CANCELLED"}:
                raise DashScopeAudioError(
                    nested_string(response, ["output", "code"]) or "ASR_TASK_FAILED",
                    nested_string(response, ["output", "message"]) or "阿里云语音识别任务失败",
                )

            time.sleep(2)

        raise DashScopeAudioError(
            "ASR_TASK_TIMEOUT",
            nested_string(last_response or {}, ["output", "message"]) or "阿里云语音识别任务超时",
        )

    def _query_task(self, task_id: str) -> dict[str, Any]:
        try:
            return self._request_json("GET", f"/tasks/{task_id}")
        except DashScopeAudioError as error:
            if error.status_code == 405:
                return self._post_json(f"/tasks/{task_id}", {})
            raise

    def _download_transcription_payloads(self, response: dict[str, Any]) -> list[dict[str, Any]]:
        payloads: list[dict[str, Any]] = []

        for url in collect_transcription_urls(response):
            downloaded = self._request_absolute_json(url)
            if isinstance(downloaded, dict):
                payloads.append(downloaded)

        return payloads

    def _post_json(
        self,
        path: str,
        payload: dict[str, Any],
        *,
        extra_headers: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        return self._request_json("POST", path, payload, extra_headers=extra_headers)

    def _request_json(
        self,
        method: str,
        path: str,
        payload: dict[str, Any] | None = None,
        *,
        extra_headers: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        endpoint = f"{self.config.base_url.rstrip('/')}/{path.lstrip('/')}"
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8") if payload is not None else None
        headers = {
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if extra_headers:
            headers.update(extra_headers)
        request = urllib.request.Request(
            endpoint,
            data=data,
            headers=headers,
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

    def _request_absolute_json(self, url: str) -> dict[str, Any] | None:
        request = urllib.request.Request(url, headers={"Accept": "application/json"}, method="GET")

        try:
            with urllib.request.urlopen(request, timeout=self.config.timeout_seconds) as response:
                parsed = safe_json(response.read().decode("utf-8", errors="ignore"))
                return parsed if isinstance(parsed, dict) else None
        except (urllib.error.HTTPError, TimeoutError, OSError):
            return None


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


def collect_transcription_urls(value: Any) -> list[str]:
    urls: list[str] = []

    def visit(current: Any) -> None:
        if isinstance(current, dict):
            for key, child in current.items():
                if key in {"transcription_url", "transcriptionUrl", "url"} and isinstance(child, str):
                    if child.startswith(("http://", "https://")):
                        urls.append(child)
                else:
                    visit(child)
            return

        if isinstance(current, list):
            for item in current:
                visit(item)

    visit(value)

    return list(dict.fromkeys(urls))


def normalize_transcription_sentences(payloads: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []

    for payload in payloads:
        for sentence in collect_sentence_items(payload):
            text = sentence_text(sentence)
            start_ms = sentence_time_ms(sentence, ["begin_time", "beginTime", "start_time", "startTime", "start"])
            end_ms = sentence_time_ms(sentence, ["end_time", "endTime", "finish_time", "finishTime", "end"])

            if not text or start_ms is None:
                continue

            if end_ms is None or end_ms <= start_ms:
                end_ms = start_ms + max(800, min(4000, len(text) * 280))

            normalized.append(
                {
                    "text": text,
                    "beginTimeMs": start_ms,
                    "endTimeMs": end_ms,
                }
            )

    normalized.sort(key=lambda item: (item["beginTimeMs"], item["endTimeMs"]))

    return dedupe_sentences(normalized)


def collect_sentence_items(value: Any) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []

    def visit(current: Any) -> None:
        if isinstance(current, dict):
            for key in ("sentences", "sentence_list", "sentenceList"):
                sentence_list = current.get(key)
                if isinstance(sentence_list, list):
                    items.extend([item for item in sentence_list if isinstance(item, dict)])

            for child in current.values():
                visit(child)
            return

        if isinstance(current, list):
            for item in current:
                visit(item)

    visit(value)

    return items


def sentence_text(sentence: dict[str, Any]) -> str:
    for key in ("text", "sentence", "transcript"):
        value = sentence.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return ""


def sentence_time_ms(sentence: dict[str, Any], keys: list[str]) -> int | None:
    for key in keys:
        value = sentence.get(key)
        parsed = parse_time_ms(value)
        if parsed is not None:
            return parsed
    return None


def parse_time_ms(value: Any) -> int | None:
    if isinstance(value, int):
        return value if value >= 0 else None

    if isinstance(value, float):
        if value < 0:
            return None
        return round(value * 1000) if not value.is_integer() else round(value)

    if isinstance(value, str):
        normalized = value.strip()
        if not normalized:
            return None
        if ":" in normalized:
            parts = normalized.replace(",", ".").split(":")
            try:
                seconds = 0.0
                for part in parts:
                    seconds = seconds * 60 + float(part)
                return round(seconds * 1000)
            except ValueError:
                return None
        try:
            parsed = float(normalized)
        except ValueError:
            return None
        return round(parsed * 1000) if "." in normalized else round(parsed)

    return None


def dedupe_sentences(sentences: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[tuple[int, int, str]] = set()
    output: list[dict[str, Any]] = []

    for sentence in sentences:
        key = (sentence["beginTimeMs"], sentence["endTimeMs"], sentence["text"])
        if key in seen:
            continue
        seen.add(key)
        output.append(sentence)

    return output


def srt_from_sentences(sentences: list[dict[str, Any]]) -> str:
    blocks = []

    for index, sentence in enumerate(sentences, start=1):
        blocks.append(
            "\n".join(
                [
                    str(index),
                    f"{format_srt_time(sentence['beginTimeMs'])} --> {format_srt_time(sentence['endTimeMs'])}",
                    sentence["text"],
                ]
            )
        )

    return "\n\n".join(blocks).strip()


def format_srt_time(value_ms: int) -> str:
    total_ms = max(0, value_ms)
    hours = total_ms // 3_600_000
    total_ms %= 3_600_000
    minutes = total_ms // 60_000
    total_ms %= 60_000
    seconds = total_ms // 1000
    milliseconds = total_ms % 1000

    return f"{hours:02}:{minutes:02}:{seconds:02},{milliseconds:03}"
