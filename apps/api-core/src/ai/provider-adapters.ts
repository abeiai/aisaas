import { HttpStatus } from "@nestjs/common";
import { decryptSecret } from "@aisaas/database";
import { AppException } from "../common/app-exception.js";
import { calculateUsageCredits, type TokenUsage } from "./ai-cost.js";

export type ProviderAdapterType =
  | "OPENAI_COMPATIBLE"
  | "CUSTOM_OPENAI_COMPATIBLE"
  | "ANTHROPIC"
  | "GEMINI";

export interface ProviderAdapter {
  readonly type: ProviderAdapterType;
  testConnection(input: ProviderTestInput): Promise<ProviderTestResult>;
  generateText(input: ProviderTextInput): Promise<ProviderTextResult>;
  streamText(input: ProviderStreamInput): Promise<ProviderTextResult>;
  generateEmbedding(input: ProviderEmbeddingInput): Promise<ProviderEmbeddingResult>;
  generateImage(input: ProviderImageInput): Promise<ProviderImageResult>;
  calculateUsage(input: ProviderUsageInput): number;
}

export interface ProviderTestInput {
  baseUrl: string;
  apiKeyEncrypted: string;
  modelName: string;
  timeoutMs: number;
}

export interface ProviderTestResult {
  success: boolean;
  message: string;
}

export interface ProviderTextInput {
  gatewayBaseUrl: string;
  scenarioSlug: string;
  baseUrl: string;
  apiKeyEncrypted: string;
  modelName: string;
  prompt: string;
  input: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
}

export interface ProviderStreamInput extends ProviderTextInput {
  onDelta: (text: string) => void;
  signal?: AbortSignal;
}

export interface ProviderTextResult {
  text: string;
  usage?: TokenUsage;
  usageCredits?: number;
  provider?: string;
  model?: string;
  requestId?: string | null;
  finishReason?: string | null;
  errorCode?: string | null;
  latencyMs?: number | null;
}

export interface ProviderEmbeddingInput {
  text: string;
}

export interface ProviderEmbeddingResult {
  embedding: number[];
  usage?: TokenUsage;
}

export interface ProviderImageInput {
  prompt: string;
}

export interface ProviderImageResult {
  imageUrl?: string;
  imageBase64?: string;
}

export interface ProviderUsageInput {
  usage?: TokenUsage | null;
  inputPrice: number;
  outputPrice: number;
  fallbackCredits: number;
  maxCredits: number;
  minCredits?: number;
}

interface AiGatewayResponse {
  output?: unknown;
  text?: unknown;
  usage?: {
    inputTokens?: unknown;
    outputTokens?: unknown;
    totalTokens?: unknown;
  };
  usageCredits?: unknown;
  provider?: unknown;
  model?: unknown;
  finishReason?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  requestId?: string | null;
  detail?: unknown;
}

export function getProviderAdapter(type: string | null | undefined): ProviderAdapter {
  if (type === "ANTHROPIC") {
    return new AnthropicProviderAdapter();
  }

  if (type === "GEMINI") {
    return new GeminiProviderAdapter();
  }

  return new OpenAiCompatibleProviderAdapter(
    type === "CUSTOM_OPENAI_COMPATIBLE" ? "CUSTOM_OPENAI_COMPATIBLE" : "OPENAI_COMPATIBLE"
  );
}

class OpenAiCompatibleProviderAdapter implements ProviderAdapter {
  constructor(readonly type: ProviderAdapterType = "OPENAI_COMPATIBLE") {}

  async testConnection(input: ProviderTestInput): Promise<ProviderTestResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), input.timeoutMs);

    try {
      const response = await fetch(`${normalizeBaseUrl(input.baseUrl)}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${decryptSecret(input.apiKeyEncrypted)}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: input.modelName,
          messages: [
            {
              role: "user",
              content: "ping"
            }
          ],
          max_tokens: 1,
          temperature: 0
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        return {
          success: false,
          message: providerTestMessage(response.status)
        };
      }

      return {
        success: true,
        message: "连接成功"
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error && error.name === "AbortError" ? "连接超时" : "Base URL 无法访问"
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async generateText(input: ProviderTextInput): Promise<ProviderTextResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), input.timeoutMs);
    const startedAt = Date.now();

    try {
      const response = await fetch(`${input.gatewayBaseUrl}/v1/text/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          scenarioSlug: input.scenarioSlug,
          baseUrl: input.baseUrl,
          apiKey: decryptSecret(input.apiKeyEncrypted),
          modelName: input.modelName,
          prompt: input.prompt,
          messages: [
            {
              role: "user",
              content: input.prompt
            }
          ],
          input: input.input,
          temperature: input.temperature,
          maxTokens: input.maxTokens
        }),
        signal: controller.signal
      });
      const responsePayload = (await response.json().catch(() => null)) as AiGatewayResponse | null;

      if (!response.ok) {
        throw new ProviderAdapterException(
          responsePayload?.errorCode ?? `HTTP_${response.status}`,
          gatewayErrorMessage(responsePayload)
        );
      }

      const text = textOutput(responsePayload);

      if (!text) {
        throw new ProviderAdapterException("EMPTY_OUTPUT", "AI Provider 返回内容为空");
      }

      return {
        text,
        usage: usageFromGateway(responsePayload),
        usageCredits: typeof responsePayload?.usageCredits === "number" ? responsePayload.usageCredits : undefined,
        provider: stringValue(responsePayload?.provider),
        model: stringValue(responsePayload?.model),
        requestId: responsePayload?.requestId ?? null,
        finishReason: responsePayload?.finishReason ?? null,
        errorCode: responsePayload?.errorCode ?? null,
        latencyMs: Date.now() - startedAt
      };
    } catch (error) {
      if (error instanceof ProviderAdapterException) {
        throw error;
      }

      throw new ProviderAdapterException(
        error instanceof Error && error.name === "AbortError" ? "AI_GATEWAY_TIMEOUT" : "AI_GATEWAY_ERROR",
        "AI Gateway 调用失败"
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  async streamText(input: ProviderStreamInput): Promise<ProviderTextResult> {
    const startedAt = Date.now();
    const response = await fetch(`${input.gatewayBaseUrl}/v1/text/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream"
      },
      body: JSON.stringify({
        scenarioSlug: input.scenarioSlug,
        baseUrl: input.baseUrl,
        apiKey: decryptSecret(input.apiKeyEncrypted),
        modelName: input.modelName,
        prompt: input.prompt,
        messages: [
          {
            role: "user",
            content: input.prompt
          }
        ],
        input: input.input,
        temperature: input.temperature,
        maxTokens: input.maxTokens
      }),
      signal: input.signal
    });

    if (!response.ok || !response.body) {
      throw new ProviderAdapterException(`HTTP_${response.status}`, "AI Gateway 流式调用失败");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";
    let donePayload: (AiGatewayResponse & { done?: boolean }) | null = null;

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, {
        stream: true
      });

      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const line = part
          .split("\n")
          .find((item) => item.startsWith("data:"))
          ?.replace(/^data:\s*/, "");

        if (!line) {
          continue;
        }

        const payload = JSON.parse(line) as AiGatewayResponse & {
          done?: boolean;
        };

        if (typeof payload.errorMessage === "string" && payload.errorMessage) {
          throw new ProviderAdapterException(payload.errorCode ?? "STREAM_ERROR", "AI 流式生成失败，请稍后重试");
        }

        const chunk = textOutput(payload);

        if (chunk) {
          text += chunk;
          input.onDelta(chunk);
        }

        if (payload.done) {
          donePayload = payload;
        }
      }
    }

    if (!text.trim()) {
      throw new ProviderAdapterException("EMPTY_OUTPUT", "AI Provider 返回内容为空");
    }

    return {
      text,
      usage: usageFromGateway(donePayload),
      usageCredits: typeof donePayload?.usageCredits === "number" ? donePayload.usageCredits : undefined,
      provider: stringValue(donePayload?.provider),
      model: stringValue(donePayload?.model),
      requestId: donePayload?.requestId ?? null,
      finishReason: donePayload?.finishReason ?? null,
      errorCode: donePayload?.errorCode ?? null,
      latencyMs: Date.now() - startedAt
    };
  }

  async generateEmbedding(): Promise<ProviderEmbeddingResult> {
    throw unsupportedCapability("Embedding 生成");
  }

  async generateImage(): Promise<ProviderImageResult> {
    throw unsupportedCapability("图像生成");
  }

  calculateUsage(input: ProviderUsageInput) {
    return calculateUsageCredits(input);
  }
}

class ReservedProviderAdapter implements ProviderAdapter {
  constructor(readonly type: ProviderAdapterType) {}

  async testConnection(): Promise<ProviderTestResult> {
    return {
      success: false,
      message: `${adapterName(this.type)} Adapter 已预留，暂未启用`
    };
  }

  async generateText(): Promise<ProviderTextResult> {
    throw reservedAdapter(this.type);
  }

  async streamText(): Promise<ProviderTextResult> {
    throw reservedAdapter(this.type);
  }

  async generateEmbedding(): Promise<ProviderEmbeddingResult> {
    throw reservedAdapter(this.type);
  }

  async generateImage(): Promise<ProviderImageResult> {
    throw reservedAdapter(this.type);
  }

  calculateUsage(input: ProviderUsageInput) {
    return calculateUsageCredits(input);
  }
}

class AnthropicProviderAdapter extends ReservedProviderAdapter {
  constructor() {
    super("ANTHROPIC");
  }
}

class GeminiProviderAdapter extends ReservedProviderAdapter {
  constructor() {
    super("GEMINI");
  }
}

export class ProviderAdapterException extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

function reservedAdapter(type: ProviderAdapterType) {
  return new AppException(40001, `${adapterName(type)} Adapter 已预留，暂未接入生成流程`, HttpStatus.BAD_REQUEST);
}

function unsupportedCapability(name: string) {
  return new AppException(40001, `${name}暂未接入当前 Provider Adapter`, HttpStatus.BAD_REQUEST);
}

function adapterName(type: ProviderAdapterType) {
  const names: Record<ProviderAdapterType, string> = {
    OPENAI_COMPATIBLE: "OpenAI-compatible",
    CUSTOM_OPENAI_COMPATIBLE: "自定义 OpenAI-compatible",
    ANTHROPIC: "Anthropic",
    GEMINI: "Gemini"
  };

  return names[type];
}

function providerTestMessage(status: number) {
  if (status === 401 || status === 403) {
    return "API Key 无效";
  }

  if (status === 404) {
    return "模型名称错误";
  }

  if (status >= 500) {
    return "Provider 返回错误";
  }

  return "连接失败，请检查 API Key 或 Base URL";
}

function usageFromGateway(payload: AiGatewayResponse | null): TokenUsage | undefined {
  if (!payload?.usage) {
    return undefined;
  }

  return {
    inputTokens: integerValue(payload.usage.inputTokens),
    outputTokens: integerValue(payload.usage.outputTokens),
    totalTokens: integerValue(payload.usage.totalTokens)
  };
}

function textOutput(payload: AiGatewayResponse | null) {
  const value = payload?.output ?? payload?.text;

  return typeof value === "string" ? value.trim() : "";
}

function gatewayErrorMessage(payload: AiGatewayResponse | null) {
  if (typeof payload?.errorMessage === "string" && payload.errorMessage) {
    return payload.errorMessage;
  }

  if (typeof payload?.detail === "string" && payload.detail) {
    return payload.detail;
  }

  return "AI Provider 调用失败";
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function integerValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}
