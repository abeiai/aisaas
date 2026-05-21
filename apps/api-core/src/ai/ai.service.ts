import { HttpStatus, Injectable } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import {
  decryptSecret,
  encryptSecret,
  getPrismaClient,
  maskSecret,
  type Prisma
} from "@aisaas/database";
import { AppException } from "../common/app-exception.js";
import { assertValidSlug } from "../cms/slug.js";
import { estimateMockUsageCredits, type TokenUsage } from "./ai-cost.js";
import {
  CreateAiProviderModelDto,
  ImportAiToolTemplateDto,
  UpdateAiModelDto,
  UpdateAiModelAliasDto,
  UpdateAiModelInstanceDto,
  UpdateAiProviderInstanceDto,
  UpdateAiScenarioDto,
  UpsertAiToolCategoryDto
} from "./dto/advanced-ai.dto.js";
import { CreateAiProviderDto, UpdateAiProviderDto } from "./dto/ai-provider.dto.js";
import { CreateAiChatDto } from "./dto/create-ai-chat.dto.js";
import { CreateAiTaskDto } from "./dto/create-ai-task.dto.js";
import { CreateImageGenerationDto } from "./dto/create-image-generation.dto.js";
import { CreateVideoGenerationDto } from "./dto/create-video-generation.dto.js";
import {
  getProviderAdapter,
  ProviderAdapterException,
  type ProviderAdapterType,
  type ProviderTextAttachment
} from "./provider-adapters.js";

type AiTaskStatus =
  | "CREATED"
  | "RESERVED"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "COMPENSATED";

type CreditReservationStatus = "RESERVED" | "SETTLED" | "RELEASED" | "EXPIRED" | "FAILED";
const audioRecommendedAliasKeys = [
  "tts-default",
  "tts-fast",
  "voice-clone-default",
  "voice-design-default",
  "audio-preview"
] as const;

interface AiScenarioRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  promptTemplate: string;
  promptVariables: Prisma.JsonValue | null;
  inputSchema: Prisma.JsonValue | null;
  requiredCapabilities: Prisma.JsonValue | null;
  costCredits: number;
  isEnabled: boolean;
  defaultModelId: string | null;
  fallbackModelId: string | null;
  toolCategoryId: string | null;
  sortOrder: number;
  isBuiltIn: boolean;
  templateVersion: string | null;
  toolCategory?: AiToolCategoryRecord | null;
  modelBinding?: {
    defaultModelAlias: string;
    fallbackModelAlias: string | null;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

interface AiToolCategoryRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ToolInputFieldType =
  | "text"
  | "textarea"
  | "select"
  | "number"
  | "switch"
  | "voice-select"
  | "audio-upload"
  | "slider"
  | "audio-preview"
  | "format-select";

export interface ToolInputField {
  name: string;
  label: string;
  type: ToolInputFieldType;
  required: boolean;
  placeholder: string;
  options: string[];
  min?: number;
  max?: number;
  defaultValue?: string | number | boolean;
  accept?: string[];
  maxSizeMb?: number;
}

export interface ToolInputSchema {
  fields: ToolInputField[];
}

interface NormalizedToolTemplateImport {
  name: string;
  slug: string;
  description: string | null;
  category: {
    name: string;
    slug: string;
    description: string | null;
    sortOrder: number;
    isVisible: boolean;
  };
  inputSchema: ToolInputSchema;
  promptTemplate: string;
  defaultModelAlias: string;
  fallbackModelAlias: string | null;
  requiredCapabilities: string[];
  costCredits: number;
  isEnabled: boolean;
  sortOrder: number;
  templateVersion: string | null;
}

interface AiTaskRecord {
  id: string;
  userId: string;
  scenarioId: string;
  knowledgeBaseId: string | null;
  aiProviderId: string | null;
  aiModelId: string | null;
  status: AiTaskStatus;
  input: Prisma.JsonValue;
  renderedPrompt: string | null;
  output: string | null;
  inputPreview: string | null;
  outputPreview: string | null;
  inputHash: string | null;
  outputHash: string | null;
  saveFullContent: boolean;
  errorMessage: string | null;
  estimatedCredits: number;
  actualCredits: number | null;
  providerName: string | null;
  modelName: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  createdAt: Date;
  updatedAt: Date;
  finishedAt: Date | null;
  user?: {
    id: string;
    email: string;
    nickname: string;
  };
  scenario: AiScenarioRecord;
  reservation: {
    id: string;
    amount: number;
    status: CreditReservationStatus;
    expiresAt: Date;
  } | null;
  callLogs?: AiCallLogRecord[];
  ledgerEntries?: Array<{
    id: string;
    type: string;
    amount: number;
    balanceAfter: number;
    relatedOrderId: string | null;
    relatedTaskId: string | null;
    note: string | null;
    createdAt: Date;
  }>;
}

interface ProviderResult {
  text: string;
  usageCredits?: number;
  usage?: TokenUsage;
  provider?: string;
  model?: string;
  requestId?: string | null;
  finishReason?: string | null;
  errorCode?: string | null;
  latencyMs?: number | null;
  billingModel?: ActiveAiModel | null;
  reasoningContent?: string;
}

export interface ImageGenerationResult {
  id: string;
  prompt: string;
  modelId: string;
  modelName: string;
  providerName: string;
  width: number;
  height: number;
  count: number;
  createdAt: string;
  requestId: string | null;
  images: Array<{
    id: string;
    url: string;
    alt: string;
  }>;
}

interface DashScopeImageResponse {
  request_id?: unknown;
  code?: unknown;
  message?: unknown;
  output?: unknown;
  usage?: unknown;
}

export interface VideoGenerationResult {
  id: string;
  prompt: string;
  modelId: string;
  modelName: string;
  providerName: string;
  ratio: string;
  resolution: string;
  duration: number;
  createdAt: string;
  requestId: string | null;
  providerTaskId: string;
  status: string;
  statusName: string;
  videoUrl: string | null;
  errorMessage: string | null;
}

interface DashScopeVideoResponse {
  request_id?: unknown;
  code?: unknown;
  message?: unknown;
  output?: unknown;
  usage?: unknown;
}

interface TextGenerationOptions {
  reasoningEnabled?: boolean;
  searchEnabled?: boolean;
}

interface ActiveAiModel {
  id: string;
  providerId: string | null;
  providerInstanceId?: string | null;
  modelInstanceId?: string | null;
  fallbackModelId: string | null;
  fallbackModelAlias?: string | null;
  aliasKey?: string | null;
  adapterType?: ProviderAdapterType | null;
  displayName: string;
  modelName: string;
  capabilityTags?: string[];
  inputPrice: { toString(): string };
  outputPrice: { toString(): string };
  provider: {
    id: string | null;
    instanceId?: string | null;
    name: string;
    baseUrl: string;
    apiKeyEncrypted: string;
  };
}

interface AiCallLogRecord {
  id: string;
  taskId: string;
  providerId: string | null;
  modelId: string | null;
  provider: string;
  model: string;
  requestId: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  latencyMs: number | null;
  success: boolean;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: Date;
}

@Injectable()
export class AiService {
  private readonly prisma = getPrismaClient();

  async listScenarios() {
    const scenarios = await this.prisma.aiScenario.findMany({
      where: {
        isEnabled: true
      },
      include: {
        modelBinding: true,
        toolCategory: true
      },
      orderBy: [
        {
          sortOrder: "asc"
        },
        {
          createdAt: "asc"
        }
      ]
    });

    return scenarios.map((scenario) => this.toScenario(scenario));
  }

  async listAdminScenarios() {
    const scenarios = await this.prisma.aiScenario.findMany({
      include: {
        modelBinding: true,
        toolCategory: true
      },
      orderBy: [
        {
          sortOrder: "asc"
        },
        {
          createdAt: "asc"
        }
      ]
    });

    return scenarios.map((scenario) => this.toScenario(scenario));
  }

  async listToolCategories(includeHidden = false) {
    const categories = await this.prisma.aiToolCategory.findMany({
      where: includeHidden
        ? undefined
        : {
            isVisible: true
          },
      orderBy: [
        {
          sortOrder: "asc"
        },
        {
          createdAt: "asc"
        }
      ]
    });

    return categories.map((category) => this.toToolCategory(category));
  }

  async createToolCategory(dto: UpsertAiToolCategoryDto) {
    const name = dto.name?.trim();
    const slug = dto.slug?.trim();

    if (!name) {
      throw new AppException(40001, "分类名称不能为空", HttpStatus.BAD_REQUEST);
    }

    const normalizedSlug = slug ?? "";
    assertValidSlug(normalizedSlug);
    await this.assertToolCategorySlugAvailable(normalizedSlug);

    const category = await this.prisma.aiToolCategory.create({
      data: {
        name,
        slug: normalizedSlug,
        description: emptyToNull(dto.description),
        sortOrder: dto.sortOrder ?? 0,
        isVisible: dto.isVisible ?? true
      }
    });

    return this.toToolCategory(category);
  }

  async updateToolCategory(id: string, dto: UpsertAiToolCategoryDto) {
    const existing = await this.prisma.aiToolCategory.findUnique({
      where: {
        id
      }
    });

    if (!existing) {
      throw new AppException(40401, "工具分类不存在", HttpStatus.NOT_FOUND);
    }

    if (dto.slug !== undefined) {
      const slug = dto.slug.trim();
      assertValidSlug(slug);
      await this.assertToolCategorySlugAvailable(slug, id);
    }

    const category = await this.prisma.aiToolCategory.update({
      where: {
        id
      },
      data: {
        name: dto.name?.trim(),
        slug: dto.slug?.trim(),
        description: dto.description === undefined ? undefined : emptyToNull(dto.description),
        sortOrder: dto.sortOrder,
        isVisible: dto.isVisible
      }
    });

    return this.toToolCategory(category);
  }

  async listTools(categorySlug?: string) {
    const normalizedCategorySlug = categorySlug?.trim();
    const tools = await this.prisma.aiScenario.findMany({
      where: {
        isEnabled: true,
        toolCategory: normalizedCategorySlug
          ? {
              slug: normalizedCategorySlug,
              isVisible: true
            }
          : {
              isVisible: true
            }
      },
      include: {
        modelBinding: true,
        toolCategory: true
      },
      orderBy: [
        {
          sortOrder: "asc"
        },
        {
          createdAt: "asc"
        }
      ]
    });

    return tools.map((tool) => this.toScenario(tool));
  }

  async getTool(slug: string) {
    const tool = await this.prisma.aiScenario.findFirst({
      where: {
        slug,
        isEnabled: true,
        toolCategory: {
          isVisible: true
        }
      },
      include: {
        modelBinding: true,
        toolCategory: true
      }
    });

    if (!tool) {
      throw new AppException(40401, "AI 工具不存在或已停用", HttpStatus.NOT_FOUND);
    }

    return this.toScenario(tool);
  }

  async listChatModels() {
    const models = await this.prisma.aiModelInstance.findMany({
      where: {
        isEnabled: true,
        providerInstance: {
          status: "ENABLED"
        }
      },
      include: {
        aliases: true,
        providerInstance: {
          include: {
            credential: true,
            providerPreset: true
          }
        }
      },
      orderBy: [
        {
          updatedAt: "desc"
        },
        {
          createdAt: "desc"
        }
      ]
    });
    const configuredModels = models
      .filter((model) => {
        const capabilityTags = jsonStringArray(model.capabilityTags);

        return Boolean(model.providerInstance.credential) && capabilityTags.includes("TEXT");
      })
      .map((model) => ({
        id: model.id,
        displayName: model.displayName,
        providerName: model.providerInstance.name,
        providerPresetName: model.providerInstance.providerPreset.displayName,
        modelName: model.providerModelName,
        capabilityTags: jsonStringArray(model.capabilityTags),
        aliases: model.aliases.map((alias) => ({
          aliasKey: alias.aliasKey,
          displayName: alias.displayName
        })),
        isMock: false
      }));

    return [
      {
        id: "mock",
        displayName: "本地演示模型",
        providerName: "AI SaaS",
        providerPresetName: "内置体验",
        modelName: "mock-chat",
        capabilityTags: ["TEXT", "STREAMING"],
        aliases: [],
        isMock: true
      },
      ...configuredModels
    ];
  }

  async listImageModels() {
    const models = await this.prisma.aiModelInstance.findMany({
      where: {
        isEnabled: true,
        providerInstance: {
          status: "ENABLED"
        }
      },
      include: {
        aliases: true,
        providerInstance: {
          include: {
            credential: true,
            providerPreset: true
          }
        }
      },
      orderBy: [
        {
          updatedAt: "desc"
        },
        {
          createdAt: "desc"
        }
      ]
    });

    return models
      .filter((model) => {
        const capabilityTags = jsonStringArray(model.capabilityTags);

        return Boolean(model.providerInstance.credential) && capabilityTags.includes("IMAGE_GENERATION");
      })
      .map((model) => {
        const capabilityTags = jsonStringArray(model.capabilityTags);
        const supportsReferenceImages = ["VISION", "MULTIMODAL", "IMAGE_INPUT", "REFERENCE_IMAGE", "IMAGE_REFERENCE"].some((tag) =>
          capabilityTags.includes(tag)
        );

        return {
          id: model.id,
          displayName: model.displayName,
          providerName: model.providerInstance.name,
          providerPresetName: model.providerInstance.providerPreset.displayName,
          modelName: model.providerModelName,
          capabilityTags,
          aliases: model.aliases.map((alias) => ({
            aliasKey: alias.aliasKey,
            displayName: alias.displayName
          })),
          maxReferenceImages: supportsReferenceImages ? imageReferenceLimit(model.providerModelName, capabilityTags) : 0,
          maxOutputImages: imageOutputLimit(capabilityTags, model.providerModelName),
          isMock: false
        };
      })
      .sort((left, right) => imageGenerationModelPriority(left.modelName) - imageGenerationModelPriority(right.modelName));
  }

  async generateImage(userId: string, dto: CreateImageGenerationDto): Promise<ImageGenerationResult> {
    void userId;

    const prompt = dto.prompt.trim();
    const model = await this.getImageGenerationModel(dto.modelInstanceId);
    const capabilityTags = jsonStringArray(model.capabilityTags);
    const maxReferenceImages = imageReferenceLimit(model.providerModelName, capabilityTags);
    const referenceImages = normalizeImageReferences(dto.referenceImages, maxReferenceImages);
    const count = Math.max(1, Math.min(dto.count || 1, imageOutputLimit(capabilityTags, model.providerModelName)));
    const width = Math.max(512, Math.min(dto.width || 1024, 4096));
    const height = Math.max(512, Math.min(dto.height || 1024, 4096));
    const response = await this.callDashScopeImageGeneration({
      baseUrl: model.providerInstance.baseUrl,
      apiKeyEncrypted: model.providerInstance.credential!.apiKeyEncrypted,
      modelName: model.providerModelName,
      prompt,
      width,
      height,
      count,
      referenceImages
    });
    const imageUrls = extractDashScopeImageUrls(response);

    if (imageUrls.length === 0) {
      throw new AppException(50201, "图片生成接口未返回图片，请稍后重试。", HttpStatus.BAD_GATEWAY);
    }

    return {
      id: randomUUID(),
      prompt,
      modelId: model.id,
      modelName: model.displayName,
      providerName: model.providerInstance.name,
      width,
      height,
      count: imageUrls.length,
      createdAt: new Date().toISOString(),
      requestId: stringValue(response.request_id) ?? null,
      images: imageUrls.map((url, index) => ({
        id: randomUUID(),
        url,
        alt: `${prompt.slice(0, 80)} - ${index + 1}`
      }))
    };
  }

  private async getImageGenerationModel(modelInstanceId: string) {
    const model = await this.prisma.aiModelInstance.findUnique({
      where: {
        id: modelInstanceId
      },
      include: {
        providerInstance: {
          include: {
            credential: true,
            providerPreset: true
          }
        }
      }
    });

    if (!model) {
      throw new AppException(40401, "所选图片模型不存在", HttpStatus.NOT_FOUND);
    }

    const capabilityTags = jsonStringArray(model.capabilityTags);

    if (!model.isEnabled || model.providerInstance.status !== "ENABLED") {
      throw new AppException(40001, "所选图片模型或 Provider 未启用，请先在后台完成配置。", HttpStatus.BAD_REQUEST);
    }

    if (!model.providerInstance.credential) {
      throw new AppException(40001, "图片生成 Provider 尚未配置 API Key，请先在后台填写。", HttpStatus.BAD_REQUEST);
    }

    if (!capabilityTags.includes("IMAGE_GENERATION")) {
      throw new AppException(40001, "所选模型不支持图片生成，请重新选择模型。", HttpStatus.BAD_REQUEST);
    }

    if (!isDashScopeImageGenerationModel(model.providerModelName)) {
      throw new AppException(40001, "当前仅支持阿里云百炼图片生成模型。", HttpStatus.BAD_REQUEST);
    }

    return model;
  }

  private async callDashScopeImageGeneration(input: {
    baseUrl: string;
    apiKeyEncrypted: string;
    modelName: string;
    prompt: string;
    width: number;
    height: number;
    count: number;
    referenceImages: ProviderTextAttachment[];
  }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), aiImageTimeoutMs());
    const content = [
      ...input.referenceImages.map((image) => ({
        image: image.dataUrl
      })),
      {
        text: input.prompt
      }
    ];

    try {
      const response = await fetch(dashScopeImageEndpoint(input.baseUrl), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${decryptSecret(input.apiKeyEncrypted)}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: input.modelName,
          input: {
            messages: [
              {
                role: "user",
                content
              }
            ]
          },
          parameters: {
            size: `${input.width}*${input.height}`,
            n: input.count,
            watermark: false
          }
        }),
        signal: controller.signal
      });
      const payload = (await response.json().catch(() => null)) as DashScopeImageResponse | null;

      if (!response.ok || !payload) {
        throw new AppException(
          50201,
          dashScopeImageErrorMessage(payload, response.status),
          HttpStatus.BAD_GATEWAY
        );
      }

      if (typeof payload.code === "string" && payload.code) {
        throw new AppException(50201, dashScopeImageErrorMessage(payload, response.status), HttpStatus.BAD_GATEWAY);
      }

      return payload;
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }

      throw new AppException(
        50201,
        error instanceof Error && error.name === "AbortError" ? "图片生成接口请求超时，请稍后重试。" : "图片生成接口调用失败，请稍后重试。",
        HttpStatus.BAD_GATEWAY
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  async listVideoModels() {
    const models = await this.prisma.aiModelInstance.findMany({
      where: {
        isEnabled: true,
        providerInstance: {
          status: "ENABLED"
        }
      },
      include: {
        aliases: true,
        providerInstance: {
          include: {
            credential: true,
            providerPreset: true
          }
        }
      },
      orderBy: [
        {
          updatedAt: "desc"
        },
        {
          createdAt: "desc"
        }
      ]
    });

    return models
      .filter((model) => {
        const capabilityTags = jsonStringArray(model.capabilityTags);

        return Boolean(model.providerInstance.credential) && capabilityTags.includes("VIDEO_GENERATION");
      })
      .map((model) => {
        const capabilityTags = jsonStringArray(model.capabilityTags);

        return {
          id: model.id,
          displayName: model.displayName,
          providerName: model.providerInstance.name,
          providerPresetName: model.providerInstance.providerPreset.displayName,
          modelName: model.providerModelName,
          capabilityTags,
          aliases: model.aliases.map((alias) => ({
            aliasKey: alias.aliasKey,
            displayName: alias.displayName
          })),
          maxReferenceFiles: videoReferenceLimit(model.providerModelName, capabilityTags),
          acceptedReferenceTypes: videoReferenceAccept(model.providerModelName, capabilityTags),
          defaultDuration: videoDefaultDuration(model.providerModelName),
          isMock: false
        };
      })
      .sort((left, right) => videoGenerationModelPriority(left.modelName) - videoGenerationModelPriority(right.modelName));
  }

  async generateVideo(userId: string, dto: CreateVideoGenerationDto): Promise<VideoGenerationResult> {
    void userId;

    const prompt = dto.prompt.trim();
    const model = await this.getVideoGenerationModel(dto.modelInstanceId);
    const capabilityTags = jsonStringArray(model.capabilityTags);
    const maxReferenceFiles = videoReferenceLimit(model.providerModelName, capabilityTags);
    const referenceFiles = normalizeVideoReferences(dto.referenceFiles, maxReferenceFiles, model.providerModelName, capabilityTags);
    const duration = Math.max(3, Math.min(dto.duration ?? videoDefaultDuration(model.providerModelName), 10));
    const ratio = normalizedVideoRatio(dto.ratio);
    const resolution = normalizedVideoResolution(dto.resolution);
    const response = await this.callDashScopeVideoGeneration({
      baseUrl: model.providerInstance.baseUrl,
      apiKeyEncrypted: model.providerInstance.credential!.apiKeyEncrypted,
      modelName: model.providerModelName,
      prompt,
      ratio,
      resolution,
      duration,
      referenceFiles
    });
    const providerTaskId = dashScopeTaskId(response);
    const videoUrl = extractDashScopeVideoUrls(response)[0] ?? null;

    if (!providerTaskId && !videoUrl) {
      throw new AppException(50201, "视频生成接口未返回任务编号，请稍后重试。", HttpStatus.BAD_GATEWAY);
    }

    return {
      id: randomUUID(),
      prompt,
      modelId: model.id,
      modelName: model.displayName,
      providerName: model.providerInstance.name,
      ratio,
      resolution,
      duration,
      createdAt: new Date().toISOString(),
      requestId: stringValue(response.request_id) ?? null,
      providerTaskId: providerTaskId ?? randomUUID(),
      status: videoUrl ? "SUCCEEDED" : "RUNNING",
      statusName: videoUrl ? "生成完成" : "任务已提交",
      videoUrl,
      errorMessage: null
    };
  }

  async getVideoGenerationTask(userId: string, taskId: string, modelInstanceId: string) {
    void userId;

    const normalizedTaskId = emptyToNull(taskId);
    if (!normalizedTaskId) {
      throw new AppException(40001, "视频任务编号不能为空", HttpStatus.BAD_REQUEST);
    }

    const model = await this.getVideoGenerationModel(modelInstanceId);
    const response = await this.queryDashScopeVideoTask({
      baseUrl: model.providerInstance.baseUrl,
      apiKeyEncrypted: model.providerInstance.credential!.apiKeyEncrypted,
      taskId: normalizedTaskId
    });
    const status = dashScopeVideoStatus(response);
    const videoUrl = extractDashScopeVideoUrls(response)[0] ?? null;
    const errorMessage = dashScopeVideoTaskError(response);

    return {
      providerTaskId: normalizedTaskId,
      status,
      statusName: videoTaskStatusName(status),
      videoUrl,
      errorMessage,
      requestId: stringValue(response.request_id) ?? null
    };
  }

  private async getVideoGenerationModel(modelInstanceId: string) {
    const model = await this.prisma.aiModelInstance.findUnique({
      where: {
        id: modelInstanceId
      },
      include: {
        providerInstance: {
          include: {
            credential: true,
            providerPreset: true
          }
        }
      }
    });

    if (!model) {
      throw new AppException(40401, "所选视频模型不存在", HttpStatus.NOT_FOUND);
    }

    const capabilityTags = jsonStringArray(model.capabilityTags);

    if (!model.isEnabled || model.providerInstance.status !== "ENABLED") {
      throw new AppException(40001, "所选视频模型或 Provider 未启用，请先在后台完成配置。", HttpStatus.BAD_REQUEST);
    }

    if (!model.providerInstance.credential) {
      throw new AppException(40001, "视频生成 Provider 尚未配置 API Key，请先在后台填写。", HttpStatus.BAD_REQUEST);
    }

    if (!capabilityTags.includes("VIDEO_GENERATION")) {
      throw new AppException(40001, "所选模型不支持视频生成，请重新选择模型。", HttpStatus.BAD_REQUEST);
    }

    if (!isDashScopeVideoGenerationModel(model.providerModelName)) {
      throw new AppException(40001, "当前仅支持阿里云百炼视频生成模型。", HttpStatus.BAD_REQUEST);
    }

    return model;
  }

  private async callDashScopeVideoGeneration(input: {
    baseUrl: string;
    apiKeyEncrypted: string;
    modelName: string;
    prompt: string;
    ratio: string;
    resolution: string;
    duration: number;
    referenceFiles: ProviderTextAttachment[];
  }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), aiVideoTimeoutMs());

    try {
      const response = await fetch(dashScopeVideoEndpoint(input.baseUrl), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${decryptSecret(input.apiKeyEncrypted)}`,
          "Content-Type": "application/json",
          "X-DashScope-Async": "enable"
        },
        body: JSON.stringify({
          model: input.modelName,
          input: dashScopeVideoInput(input.modelName, input.prompt, input.referenceFiles),
          parameters: {
            size: videoSizeFromRatio(input.ratio, input.resolution),
            duration: input.duration,
            watermark: false,
            prompt_extend: true
          }
        }),
        signal: controller.signal
      });
      const payload = (await response.json().catch(() => null)) as DashScopeVideoResponse | null;

      if (!response.ok || !payload) {
        throw new AppException(50201, dashScopeVideoErrorMessage(payload, response.status), HttpStatus.BAD_GATEWAY);
      }

      if (typeof payload.code === "string" && payload.code) {
        throw new AppException(50201, dashScopeVideoErrorMessage(payload, response.status), HttpStatus.BAD_GATEWAY);
      }

      return payload;
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }

      throw new AppException(
        50201,
        error instanceof Error && error.name === "AbortError" ? "视频生成接口请求超时，请稍后重试。" : "视频生成接口调用失败，请稍后重试。",
        HttpStatus.BAD_GATEWAY
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private async queryDashScopeVideoTask(input: {
    baseUrl: string;
    apiKeyEncrypted: string;
    taskId: string;
  }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), aiVideoTaskTimeoutMs());

    try {
      const response = await fetch(dashScopeTaskEndpoint(input.baseUrl, input.taskId), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${decryptSecret(input.apiKeyEncrypted)}`
        },
        signal: controller.signal
      });
      const payload = (await response.json().catch(() => null)) as DashScopeVideoResponse | null;

      if (!response.ok || !payload) {
        throw new AppException(50201, dashScopeVideoErrorMessage(payload, response.status), HttpStatus.BAD_GATEWAY);
      }

      return payload;
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }

      throw new AppException(
        50201,
        error instanceof Error && error.name === "AbortError" ? "视频任务查询超时，请稍后重试。" : "视频任务查询失败，请稍后重试。",
        HttpStatus.BAD_GATEWAY
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  async updateScenario(id: string, dto: UpdateAiScenarioDto) {
    const existing = await this.prisma.aiScenario.findUnique({
      where: {
        id
      },
      include: {
        modelBinding: true,
        toolCategory: true
      }
    });

    if (!existing) {
      throw new AppException(40401, "AI 场景不存在", HttpStatus.NOT_FOUND);
    }

    await this.assertModelUsable(dto.defaultModelId);
    await this.assertModelUsable(dto.fallbackModelId);
    await this.assertAliasExists(dto.defaultModelAlias);
    await this.assertAliasExists(dto.fallbackModelAlias);
    await this.assertToolCategoryExists(dto.toolCategoryId);

    const inputSchema =
      dto.inputSchema === undefined ? undefined : this.normalizeInputSchema(dto.inputSchema, true);
    const promptVariables =
      dto.promptVariables === undefined
        ? inputSchema === undefined
          ? undefined
          : promptVariablesFromInputSchema(inputSchema)
        : dto.promptVariables;

    await this.prisma.aiScenario.update({
      where: {
        id
      },
      data: {
        name: dto.name?.trim(),
        description: dto.description?.trim(),
        promptTemplate: dto.promptTemplate?.trim(),
        promptVariables:
          promptVariables === undefined
            ? undefined
            : (promptVariables as unknown as Prisma.InputJsonValue),
        inputSchema:
          inputSchema === undefined ? undefined : (inputSchema as unknown as Prisma.InputJsonValue),
        costCredits: dto.costCredits,
        isEnabled: dto.isEnabled,
        defaultModelId: emptyToNull(dto.defaultModelId),
        fallbackModelId: emptyToNull(dto.fallbackModelId),
        toolCategoryId: dto.toolCategoryId === undefined ? undefined : emptyToNull(dto.toolCategoryId),
        sortOrder: dto.sortOrder,
        templateVersion:
          dto.templateVersion === undefined ? undefined : emptyToNull(dto.templateVersion),
        requiredCapabilities:
          dto.requiredCapabilities === undefined
            ? undefined
            : (normalizeCapabilityTags(dto.requiredCapabilities) as Prisma.InputJsonValue)
      },
      include: {
        modelBinding: true
      }
    });

    if (dto.defaultModelAlias !== undefined || dto.fallbackModelAlias !== undefined) {
      const defaultModelAlias = emptyToNull(dto.defaultModelAlias) ?? existing.modelBinding?.defaultModelAlias ?? "default-chat";
      await this.prisma.aiScenarioModelBinding.upsert({
        where: {
          scenarioId: id
        },
        update: {
          defaultModelAlias,
          fallbackModelAlias:
            dto.fallbackModelAlias === undefined
              ? undefined
              : emptyToNull(dto.fallbackModelAlias)
        },
        create: {
          scenarioId: id,
          defaultModelAlias,
          fallbackModelAlias: emptyToNull(dto.fallbackModelAlias)
        }
      });
    }

    const scenario = await this.prisma.aiScenario.findUniqueOrThrow({
      where: {
        id
      },
      include: {
        modelBinding: true,
        toolCategory: true
      }
    });

    return this.toScenario(scenario);
  }

  async exportToolTemplates(scenarioId?: string) {
    const scenarios = await this.prisma.aiScenario.findMany({
      where: scenarioId
        ? {
            id: scenarioId
          }
        : undefined,
      include: {
        modelBinding: true,
        toolCategory: true
      },
      orderBy: [
        {
          sortOrder: "asc"
        },
        {
          createdAt: "asc"
        }
      ]
    });

    if (scenarioId && scenarios.length === 0) {
      throw new AppException(40401, "AI 工具模板不存在", HttpStatus.NOT_FOUND);
    }

    return {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      templates: scenarios.map((scenario) => ({
        toolKey: scenario.slug,
        name: scenario.name,
        slug: scenario.slug,
        description: scenario.description,
        category: scenario.toolCategory
          ? {
              name: scenario.toolCategory.name,
              slug: scenario.toolCategory.slug,
              description: scenario.toolCategory.description,
              sortOrder: scenario.toolCategory.sortOrder,
              isVisible: scenario.toolCategory.isVisible
            }
          : null,
        inputSchema: this.normalizeInputSchema(scenario.inputSchema, false),
        promptTemplate: scenario.promptTemplate,
        modelAlias: scenario.modelBinding?.defaultModelAlias ?? "default-chat",
        defaultModelAlias: scenario.modelBinding?.defaultModelAlias ?? "default-chat",
        fallbackModelAlias: scenario.modelBinding?.fallbackModelAlias ?? null,
        requiredCapabilities: jsonStringArray(scenario.requiredCapabilities),
        costRule: {
          type: "fixed",
          credits: scenario.costCredits
        },
        costCredits: scenario.costCredits,
        isEnabled: scenario.isEnabled,
        sortOrder: scenario.sortOrder,
        templateVersion: scenario.templateVersion
      }))
    };
  }

  async previewToolTemplateImport(dto: ImportAiToolTemplateDto) {
    const templates = this.normalizeToolTemplateImport(dto.payload);
    const existing = await this.prisma.aiScenario.findMany({
      where: {
        slug: {
          in: templates.map((template) => template.slug)
        }
      },
      select: {
        slug: true
      }
    });
    const existingSlugs = new Set(existing.map((item) => item.slug));
    const items = templates.map((template) => ({
      name: template.name,
      slug: template.slug,
      categorySlug: template.category.slug,
      action: existingSlugs.has(template.slug) ? "CONFLICT" : "CREATE",
      message: existingSlugs.has(template.slug) ? "同 slug 工具已存在，导入时会跳过" : "可以导入"
    }));

    return {
      valid: true,
      total: templates.length,
      createCount: items.filter((item) => item.action === "CREATE").length,
      conflictCount: items.filter((item) => item.action === "CONFLICT").length,
      items
    };
  }

  async importToolTemplates(dto: ImportAiToolTemplateDto) {
    const templates = this.normalizeToolTemplateImport(dto.payload);
    const skipConflicts = dto.skipConflicts ?? true;
    let createdCount = 0;
    let skippedCount = 0;

    const items: Array<{
      name: string;
      slug: string;
      action: "CREATED" | "SKIPPED";
      message: string;
    }> = [];

    for (const template of templates) {
      const existing = await this.prisma.aiScenario.findUnique({
        where: {
          slug: template.slug
        },
        select: {
          id: true
        }
      });

      if (existing) {
        if (!skipConflicts) {
          throw new AppException(40002, `工具 slug 已存在：${template.slug}`, HttpStatus.BAD_REQUEST);
        }

        skippedCount += 1;
        items.push({
          name: template.name,
          slug: template.slug,
          action: "SKIPPED",
          message: "同 slug 工具已存在，已跳过"
        });
        continue;
      }

      const category = await this.ensureToolCategory(template.category);

      await this.prisma.aiScenario.create({
        data: {
          name: template.name,
          slug: template.slug,
          description: template.description,
          toolCategoryId: category.id,
          inputSchema: template.inputSchema as unknown as Prisma.InputJsonValue,
          promptVariables: promptVariablesFromInputSchema(template.inputSchema) as Prisma.InputJsonValue,
          promptTemplate: template.promptTemplate,
          requiredCapabilities: template.requiredCapabilities as Prisma.InputJsonValue,
          costCredits: template.costCredits,
          isEnabled: template.isEnabled,
          sortOrder: template.sortOrder,
          isBuiltIn: false,
          templateVersion: template.templateVersion,
          modelBinding: {
            create: {
              defaultModelAlias: template.defaultModelAlias,
              fallbackModelAlias: template.fallbackModelAlias
            }
          }
        }
      });

      createdCount += 1;
      items.push({
        name: template.name,
        slug: template.slug,
        action: "CREATED",
        message: "已导入"
      });
    }

    return {
      total: templates.length,
      createdCount,
      skippedCount,
      items
    };
  }

  async createTask(userId: string, dto: CreateAiTaskDto) {
    const input = dto.input.trim();
    const scenario = await this.prisma.aiScenario.findFirst({
      where: {
        id: dto.scenarioId,
        isEnabled: true
      },
      include: {
        modelBinding: true
      }
    });

    if (!scenario) {
      throw new AppException(40401, "AI 场景不存在或已停用", HttpStatus.NOT_FOUND);
    }

    const promptInput = await this.preparePromptInput(userId, scenario, dto);
    const activeModel = await this.getModelForScenario(scenario, dto.modelInstanceId);
    const attachments = attachmentsForModel(activeModel, normalizeProviderAttachments(dto.attachments));
    const reservedTask = await this.reserveCredits(userId, scenario, input, activeModel, promptInput);

    await this.prisma.aiTask.update({
      where: {
        id: reservedTask.id
      },
      data: {
        status: "RUNNING"
      }
    });

    try {
      const result = await this.generateTextWithFallback(
        input,
        promptInput.renderedPrompt,
        scenario,
        reservedTask.id,
        activeModel,
        attachments
      );
      const actualCredits = this.normalizeActualCredits(
        promptInput.renderedPrompt,
        scenario,
        result.billingModel ?? activeModel,
        result
      );

      return this.settleSuccessfulTask(reservedTask.id, result, actualCredits);
    } catch (error) {
      return this.releaseFailedTask(reservedTask.id, this.providerErrorMessage(error));
    }
  }

  async createTaskStream(
    userId: string,
    dto: CreateAiTaskDto,
    onEvent: (event: Record<string, unknown>) => void,
    signal?: AbortSignal
  ) {
    const input = dto.input.trim();
    const scenario = await this.prisma.aiScenario.findFirst({
      where: {
        id: dto.scenarioId,
        isEnabled: true
      },
      include: {
        modelBinding: true
      }
    });

    if (!scenario) {
      throw new AppException(40401, "AI 场景不存在或已停用", HttpStatus.NOT_FOUND);
    }

    const promptInput = await this.preparePromptInput(userId, scenario, dto);
    const activeModel = await this.getModelForScenario(scenario, dto.modelInstanceId);
    const attachments = attachmentsForModel(activeModel, normalizeProviderAttachments(dto.attachments));
    const reservedTask = await this.reserveCredits(userId, scenario, input, activeModel, promptInput);

    await this.prisma.aiTask.update({
      where: {
        id: reservedTask.id
      },
      data: {
        status: "RUNNING"
      }
    });

    onEvent({
      type: "task",
      taskId: reservedTask.id,
      status: "RUNNING"
    });

    try {
      const result = await this.streamGenerateText(
        input,
        promptInput.renderedPrompt,
        scenario,
        reservedTask.id,
        activeModel,
        onEvent,
        attachments,
        signal,
        {
          reasoningEnabled: dto.reasoningEnabled,
          searchEnabled: dto.searchEnabled
        }
      );
      const actualCredits = this.normalizeActualCredits(
        promptInput.renderedPrompt,
        scenario,
        result.billingModel ?? activeModel,
        result
      );
      const task = await this.settleSuccessfulTask(reservedTask.id, result, actualCredits);

      onEvent({
        type: "done",
        task
      });

      return task;
    } catch (error) {
      const aborted = signal?.aborted || (error instanceof Error && error.name === "AbortError");
      const task = aborted
        ? await this.cancelTask(reservedTask.id, "用户已中断流式生成，冻结点数已释放")
        : await this.releaseFailedTask(reservedTask.id, this.providerErrorMessage(error));

      onEvent({
        type: aborted ? "cancelled" : "error",
        task,
        message: aborted ? "生成已中断" : task.errorMessage
      });

      return task;
    }
  }

  async createChatStream(
    userId: string,
    dto: CreateAiChatDto,
    onEvent: (event: Record<string, unknown>) => void,
    signal?: AbortSignal
  ) {
    const scenario = await this.ensureExperienceChatScenario();
    const history = this.normalizeChatHistory(dto.messages);

    return this.createTaskStream(
      userId,
      {
        scenarioId: scenario.id,
        input: dto.input,
        variables: {
          history
        },
        modelInstanceId: dto.modelInstanceId?.trim() || "mock",
        attachments: dto.attachments,
        reasoningEnabled: dto.reasoningEnabled,
        searchEnabled: dto.searchEnabled
      },
      onEvent,
      signal
    );
  }

  async getTask(userId: string, id: string) {
    const task = await this.prisma.aiTask.findFirst({
      where: {
        id,
        userId
      },
      include: {
        scenario: true,
        reservation: true
      }
    });

    if (!task) {
      throw new AppException(40401, "AI 任务不存在", HttpStatus.NOT_FOUND);
    }

    return this.toTask(task);
  }

  async listUserTasks(userId: string) {
    const tasks = await this.prisma.aiTask.findMany({
      where: {
        userId
      },
      include: {
        scenario: true,
        reservation: true,
        callLogs: {
          orderBy: {
            createdAt: "desc"
          },
          take: 1
        },
        ledgerEntries: {
          orderBy: {
            createdAt: "desc"
          },
          take: 3
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 50
    });

    return tasks.map((task) => this.toTask(task));
  }

  async listAdminTasks() {
    const tasks = await this.prisma.aiTask.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            nickname: true
          }
        },
        scenario: true,
        reservation: true,
        callLogs: {
          orderBy: {
            createdAt: "desc"
          },
          take: 3
        },
        ledgerEntries: {
          orderBy: {
            createdAt: "desc"
          },
          take: 5
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 100
    });

    return tasks.map((task) => this.toTask(task));
  }

  async getAdminTask(id: string) {
    const task = await this.prisma.aiTask.findUnique({
      where: {
        id
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            nickname: true
          }
        },
        scenario: true,
        reservation: true,
        callLogs: {
          orderBy: {
            createdAt: "desc"
          }
        },
        ledgerEntries: {
          orderBy: {
            createdAt: "desc"
          }
        }
      }
    });

    if (!task) {
      throw new AppException(40401, "AI 任务不存在", HttpStatus.NOT_FOUND);
    }

    return this.toTask(task);
  }

  async listProviders() {
    const providers = await this.prisma.aiProvider.findMany({
      include: {
        models: {
          orderBy: {
            createdAt: "asc"
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return providers.map((provider) => this.toProvider(provider));
  }

  async createProvider(dto: CreateAiProviderDto) {
    const apiKey = dto.apiKey.trim();

    if (!apiKey) {
      throw new AppException(40001, "API Key 不能为空", HttpStatus.BAD_REQUEST);
    }

    const provider = await this.prisma.aiProvider.create({
      data: {
        name: dto.name.trim(),
        type: dto.type ?? "OPENAI_COMPATIBLE",
        baseUrl: normalizeBaseUrl(dto.baseUrl),
        apiKeyEncrypted: this.encryptApiKey(apiKey),
        apiKeyPreview: maskSecret(apiKey),
        isEnabled: dto.isEnabled ?? true,
        models: {
          create: {
            displayName: dto.modelDisplayName.trim(),
            modelName: dto.modelName.trim(),
            inputPrice: String(dto.inputPrice ?? 0),
            outputPrice: String(dto.outputPrice ?? 0),
            isEnabled: true
          }
        }
      },
      include: {
        models: true
      }
    });

    return this.toProvider(provider);
  }

  async updateProvider(id: string, dto: UpdateAiProviderDto) {
    const existing = await this.prisma.aiProvider.findUnique({
      where: {
        id
      },
      include: {
        models: {
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    });

    if (!existing) {
      throw new AppException(40401, "AI Provider 不存在", HttpStatus.NOT_FOUND);
    }

    const providerData: Prisma.AiProviderUpdateInput = {};
    const apiKey = dto.apiKey?.trim();

    if (dto.name !== undefined) {
      providerData.name = dto.name.trim();
    }

    if (dto.baseUrl !== undefined) {
      providerData.baseUrl = normalizeBaseUrl(dto.baseUrl);
    }

    if (dto.isEnabled !== undefined) {
      providerData.isEnabled = dto.isEnabled;
    }

    if (apiKey) {
      providerData.apiKeyEncrypted = this.encryptApiKey(apiKey);
      providerData.apiKeyPreview = maskSecret(apiKey);
    }

    const modelId = dto.modelId ?? existing.models[0]?.id;

    const provider = await this.prisma.$transaction(async (transaction) => {
      await transaction.aiProvider.update({
        where: {
          id
        },
        data: providerData
      });

      if (modelId) {
        await transaction.aiModel.update({
          where: {
            id: modelId
          },
          data: {
            displayName: dto.modelDisplayName?.trim(),
            modelName: dto.modelName?.trim(),
            inputPrice: dto.inputPrice === undefined ? undefined : String(dto.inputPrice),
            outputPrice: dto.outputPrice === undefined ? undefined : String(dto.outputPrice),
            isEnabled: dto.modelEnabled
          }
        });
      } else if (dto.modelDisplayName && dto.modelName) {
        await transaction.aiModel.create({
          data: {
            providerId: id,
            displayName: dto.modelDisplayName.trim(),
            modelName: dto.modelName.trim(),
            inputPrice: String(dto.inputPrice ?? 0),
            outputPrice: String(dto.outputPrice ?? 0),
            isEnabled: dto.modelEnabled ?? true
          }
        });
      }

      return transaction.aiProvider.findUniqueOrThrow({
        where: {
          id
        },
        include: {
          models: {
            orderBy: {
              createdAt: "asc"
            }
          }
        }
      });
    });

    return this.toProvider(provider);
  }

  async createProviderModel(providerId: string, dto: CreateAiProviderModelDto) {
    const provider = await this.prisma.aiProvider.findUnique({
      where: {
        id: providerId
      }
    });

    if (!provider) {
      throw new AppException(40401, "AI Provider 不存在", HttpStatus.NOT_FOUND);
    }

    await this.assertModelUsable(dto.fallbackModelId);

    const model = await this.prisma.aiModel.create({
      data: {
        providerId,
        displayName: dto.displayName.trim(),
        modelName: dto.modelName.trim(),
        inputPrice: String(dto.inputPrice ?? 0),
        outputPrice: String(dto.outputPrice ?? 0),
        supportsStreaming: dto.supportsStreaming ?? false,
        supportsVision: dto.supportsVision ?? false,
        isEnabled: dto.isEnabled ?? true,
        fallbackModelId: emptyToNull(dto.fallbackModelId)
      }
    });

    return this.toModel(model);
  }

  async updateModel(id: string, dto: UpdateAiModelDto) {
    const existing = await this.prisma.aiModel.findUnique({
      where: {
        id
      }
    });

    if (!existing) {
      throw new AppException(40401, "AI 模型不存在", HttpStatus.NOT_FOUND);
    }

    if (dto.fallbackModelId && dto.fallbackModelId === id) {
      throw new AppException(40001, "fallback 模型不能指向自身", HttpStatus.BAD_REQUEST);
    }

    await this.assertModelUsable(dto.fallbackModelId);

    const model = await this.prisma.aiModel.update({
      where: {
        id
      },
      data: {
        displayName: dto.displayName?.trim(),
        modelName: dto.modelName?.trim(),
        inputPrice: dto.inputPrice === undefined ? undefined : String(dto.inputPrice),
        outputPrice: dto.outputPrice === undefined ? undefined : String(dto.outputPrice),
        supportsStreaming: dto.supportsStreaming,
        supportsVision: dto.supportsVision,
        isEnabled: dto.isEnabled,
        fallbackModelId: dto.fallbackModelId === undefined ? undefined : emptyToNull(dto.fallbackModelId)
      }
    });

    return this.toModel(model);
  }

  async listProviderPresets() {
    const presets = await this.prisma.aiProviderPreset.findMany({
      include: {
        modelPresets: {
          orderBy: {
            createdAt: "asc"
          }
        },
        instances: {
          include: {
            credential: true,
            modelInstances: {
              include: {
                modelPreset: true,
                aliases: true
              },
              orderBy: {
                createdAt: "asc"
              }
            }
          },
          orderBy: {
            createdAt: "asc"
          }
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return presets.map((preset) => this.toProviderPreset(preset));
  }

  async getProviderPreset(id: string) {
    const preset = await this.prisma.aiProviderPreset.findUnique({
      where: {
        id
      },
      include: {
        modelPresets: {
          orderBy: {
            createdAt: "asc"
          }
        },
        instances: {
          include: {
            credential: true,
            modelInstances: {
              include: {
                modelPreset: true,
                aliases: true
              },
              orderBy: {
                createdAt: "asc"
              }
            }
          },
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    });

    if (!preset) {
      throw new AppException(40401, "AI Provider Preset 不存在", HttpStatus.NOT_FOUND);
    }

    return this.toProviderPreset(preset);
  }

  async updateProviderInstance(providerPresetId: string, dto: UpdateAiProviderInstanceDto) {
    const preset = await this.prisma.aiProviderPreset.findUnique({
      where: {
        id: providerPresetId
      },
      include: {
        instances: {
          take: 1,
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    });

    if (!preset) {
      throw new AppException(40401, "AI Provider Preset 不存在", HttpStatus.NOT_FOUND);
    }

    const existingInstance = preset.instances[0] ?? null;
    const apiKey = dto.apiKey?.trim();
    const connectionConfigChanged =
      !existingInstance ||
      Boolean(apiKey) ||
      (dto.baseUrl !== undefined && normalizeBaseUrl(dto.baseUrl) !== existingInstance.baseUrl) ||
      (dto.webSocketUrl !== undefined && emptyToNull(dto.webSocketUrl) !== existingInstance.webSocketUrl) ||
      (dto.region !== undefined && emptyToNull(dto.region) !== existingInstance.region);
    const requiresVerifiedEnable = preset.adapterType === "DASHSCOPE_AUDIO";
    const previousTestSucceeded = providerTestSucceeded(existingInstance?.lastTestResult ?? null);
    const requiresRetest =
      requiresVerifiedEnable &&
      (connectionConfigChanged || (dto.status === "ENABLED" && !previousTestSucceeded));
    const nextStatus =
      requiresVerifiedEnable && dto.status === "ENABLED" && requiresRetest
        ? "DISABLED"
        : requiresVerifiedEnable && connectionConfigChanged && existingInstance?.status === "ENABLED"
          ? "DISABLED"
          : dto.status;
    const resetTestResult = requiresRetest
      ? ({
          success: false,
          message: "配置已保存，请点击“测试连接”；测试成功后会自动启用 Provider。"
        } satisfies Prisma.InputJsonValue)
      : undefined;
    const instance = existingInstance
      ? await this.prisma.aiProviderInstance.update({
          where: {
            id: existingInstance.id
          },
          data: {
            name: dto.name?.trim(),
            baseUrl: dto.baseUrl === undefined ? undefined : normalizeBaseUrl(dto.baseUrl),
            webSocketUrl: dto.webSocketUrl === undefined ? undefined : emptyToNull(dto.webSocketUrl),
            region: dto.region === undefined ? undefined : emptyToNull(dto.region),
            status: nextStatus,
            lastTestedAt: requiresRetest ? null : undefined,
            lastTestResult: resetTestResult
          }
        })
      : await this.prisma.aiProviderInstance.create({
          data: {
            providerPresetId: preset.id,
            name: dto.name?.trim() || preset.displayName,
            baseUrl: normalizeBaseUrl(dto.baseUrl || preset.defaultBaseUrl),
            webSocketUrl: emptyToNull(dto.webSocketUrl) ?? preset.defaultWebSocketUrl,
            region: emptyToNull(dto.region) ?? preset.region?.split(",")[0] ?? null,
            status: nextStatus ?? "DISABLED",
            lastTestedAt: resetTestResult ? null : undefined,
            lastTestResult: resetTestResult
          }
        });

    if (apiKey) {
      await this.prisma.aiProviderCredential.upsert({
        where: {
          providerInstanceId: instance.id
        },
        update: {
          apiKeyEncrypted: this.encryptApiKey(apiKey)
        },
        create: {
          providerInstanceId: instance.id,
          apiKeyEncrypted: this.encryptApiKey(apiKey)
        }
      });
    }

    return this.getProviderPreset(providerPresetId);
  }

  async enableModelPreset(providerPresetId: string, modelPresetId: string, dto: UpdateAiModelInstanceDto) {
    const preset = await this.prisma.aiProviderPreset.findUnique({
      where: {
        id: providerPresetId
      },
      include: {
        instances: {
          take: 1,
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    });
    const modelPreset = await this.prisma.aiModelPreset.findFirst({
      where: {
        id: modelPresetId,
        providerPresetId
      }
    });

    if (!preset || !modelPreset) {
      throw new AppException(40401, "AI 模型预置不存在", HttpStatus.NOT_FOUND);
    }

    const instance =
      preset.instances[0] ??
      (await this.prisma.aiProviderInstance.create({
        data: {
          providerPresetId: preset.id,
          name: preset.displayName,
          baseUrl: preset.defaultBaseUrl,
          webSocketUrl: preset.defaultWebSocketUrl,
          region: preset.region?.split(",")[0] ?? null,
          status: "DISABLED"
        }
      }));

    const capabilityTags = normalizeCapabilityTags(
      dto.capabilityTags ?? jsonStringArray(modelPreset.capabilityTags)
    );

    const modelInstance = await this.prisma.aiModelInstance.upsert({
      where: {
        providerInstanceId_providerModelName: {
          providerInstanceId: instance.id,
          providerModelName: dto.providerModelName?.trim() || modelPreset.providerModelName
        }
      },
      update: {
        displayName: dto.displayName?.trim() || modelPreset.displayName,
        capabilityTags: capabilityTags as Prisma.InputJsonValue,
        inputPrice: dto.inputPrice === undefined ? undefined : String(dto.inputPrice),
        outputPrice: dto.outputPrice === undefined ? undefined : String(dto.outputPrice),
        isEnabled: dto.isEnabled ?? true,
        modelPresetId: modelPreset.id
      },
      create: {
        providerInstanceId: instance.id,
        modelPresetId: modelPreset.id,
        displayName: dto.displayName?.trim() || modelPreset.displayName,
        providerModelName: dto.providerModelName?.trim() || modelPreset.providerModelName,
        capabilityTags: capabilityTags as Prisma.InputJsonValue,
        inputPrice: String(dto.inputPrice ?? 0),
        outputPrice: String(dto.outputPrice ?? 0),
        isEnabled: dto.isEnabled ?? true
      }
    });

    await this.bindRecommendedAudioAlias(modelPreset.recommendedAlias, modelInstance.id, capabilityTags);

    return this.getProviderPreset(providerPresetId);
  }

  async updateModelInstance(id: string, dto: UpdateAiModelInstanceDto) {
    const existing = await this.prisma.aiModelInstance.findUnique({
      where: {
        id
      }
    });

    if (!existing) {
      throw new AppException(40401, "AI 模型实例不存在", HttpStatus.NOT_FOUND);
    }

    const model = await this.prisma.aiModelInstance.update({
      where: {
        id
      },
      data: {
        displayName: dto.displayName?.trim(),
        providerModelName: dto.providerModelName?.trim(),
        capabilityTags:
          dto.capabilityTags === undefined
            ? undefined
            : (normalizeCapabilityTags(dto.capabilityTags) as Prisma.InputJsonValue),
        inputPrice: dto.inputPrice === undefined ? undefined : String(dto.inputPrice),
        outputPrice: dto.outputPrice === undefined ? undefined : String(dto.outputPrice),
        isEnabled: dto.isEnabled
      }
    });

    return this.toModelInstance(model);
  }

  async listModelAliases() {
    const aliases = await this.prisma.aiModelAlias.findMany({
      include: {
        modelInstance: {
          include: {
            providerInstance: {
              include: {
                providerPreset: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    });
    const modelInstances = await this.prisma.aiModelInstance.findMany({
      where: {
        isEnabled: true,
        providerInstance: {
          status: "ENABLED"
        }
      },
      include: {
        providerInstance: {
          include: {
            providerPreset: true
          }
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return {
      aliases: aliases.map((alias) => this.toModelAlias(alias)),
      modelInstances: modelInstances.map((model) => this.toModelInstance(model))
    };
  }

  async updateModelAlias(aliasKey: string, dto: UpdateAiModelAliasDto) {
    const alias = await this.prisma.aiModelAlias.findUnique({
      where: {
        aliasKey
      }
    });

    if (!alias) {
      throw new AppException(40401, "模型别名不存在", HttpStatus.NOT_FOUND);
    }

    const modelInstanceId = emptyToNull(dto.modelInstanceId);

    if (modelInstanceId) {
      const model = await this.prisma.aiModelInstance.findFirst({
        where: {
          id: modelInstanceId,
          isEnabled: true,
          providerInstance: {
            status: "ENABLED"
          }
        },
        select: {
          id: true
        }
      });

      if (!model) {
        throw new AppException(40001, "只能绑定已启用的模型实例", HttpStatus.BAD_REQUEST);
      }
    }

    await this.prisma.aiModelAlias.update({
      where: {
        aliasKey
      },
      data: {
        modelInstanceId
      }
    });

    return this.listModelAliases();
  }

  private async bindRecommendedAudioAlias(
    aliasKey: string | null,
    modelInstanceId: string,
    capabilityTags: string[]
  ) {
    if (!aliasKey || !isAudioRecommendedAliasKey(aliasKey)) {
      return;
    }

    const requiredCapability = audioRecommendedAliasCapability(aliasKey);
    if (requiredCapability && !capabilityTags.includes(requiredCapability)) {
      return;
    }

    const alias = await this.prisma.aiModelAlias.findUnique({
      where: {
        aliasKey
      },
      include: {
        modelInstance: {
          include: {
            providerInstance: {
              include: {
                providerPreset: true
              }
            }
          }
        }
      }
    });

    if (alias?.modelInstanceId) {
      return;
    }

    await this.prisma.aiModelAlias.upsert({
      where: {
        aliasKey
      },
      update: {
        displayName: alias?.displayName ?? audioRecommendedAliasName(aliasKey),
        description: alias?.description ?? null,
        modelInstanceId
      },
      create: {
        aliasKey,
        displayName: audioRecommendedAliasName(aliasKey),
        modelInstanceId
      }
    });
  }

  async testProviderInstance(providerPresetId: string) {
    const preset = await this.prisma.aiProviderPreset.findUnique({
      where: {
        id: providerPresetId
      },
      include: {
        instances: {
          include: {
            credential: true,
            modelInstances: {
              where: {
                isEnabled: true
              }
            }
          },
          take: 1,
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    });
    const instance = preset?.instances[0];

    if (!preset || !instance) {
      throw new AppException(40401, "AI Provider 实例不存在", HttpStatus.NOT_FOUND);
    }

    const apiKey = this.resolveProviderTestApiKey(
      preset.apiKeyEnvName,
      instance.credential?.apiKeyEncrypted ?? null
    );

    if (!apiKey.apiKeyEncrypted) {
      const result = {
        success: false,
        message:
          apiKey.message ??
          `尚未配置 API Key，请在后台填写或配置环境变量 ${preset.apiKeyEnvName}`
      };
      await this.saveProviderTestResult(instance.id, result, "TEST_FAILED");
      return result;
    }

    const modelName = selectProviderTestModelName(preset.adapterType, instance.modelInstances);

    if (!modelName) {
      const result = {
        success: false,
        message: "请先启用至少一个模型"
      };
      await this.saveProviderTestResult(instance.id, result, "TEST_FAILED");
      return result;
    }

    const adapter = getProviderAdapter(preset.adapterType);
    const result = await adapter.testConnection({
      baseUrl: instance.baseUrl,
      webSocketUrl: instance.webSocketUrl,
      region: instance.region ?? preset.region,
      apiKeyEncrypted: apiKey.apiKeyEncrypted,
      modelName,
      gatewayBaseUrl: process.env.AI_GATEWAY_BASE_URL ?? "http://localhost:7343",
      timeoutMs: Number(process.env.AI_PROVIDER_TEST_TIMEOUT_MS ?? 8000)
    });

    await this.saveProviderTestResult(instance.id, result, result.success ? "ENABLED" : "TEST_FAILED");
    return result;
  }

  private async preparePromptInput(userId: string, scenario: AiScenarioRecord, dto: CreateAiTaskDto) {
    const variables = this.validateScenarioInputSchema(
      scenario,
      dto.input.trim(),
      this.normalizeVariables(dto.variables)
    );
    const promptVariables = this.promptVariables(scenario);

    for (const variable of promptVariables) {
      if (variable.required && !variables[variable.name]) {
        throw new AppException(40001, `请填写${variable.label}`, HttpStatus.BAD_REQUEST);
      }
    }

    const templateVariables = extractTemplateVariables(scenario.promptTemplate);

    for (const name of templateVariables) {
      if (name !== "input" && name !== "knowledge" && !variables[name]) {
        throw new AppException(40001, `请填写模板变量：${name}`, HttpStatus.BAD_REQUEST);
      }
    }

    const knowledgeBaseId = dto.knowledgeBaseId?.trim() || null;
    const knowledgeContext = knowledgeBaseId
      ? await this.retrieveKnowledgeContext(userId, knowledgeBaseId, dto.input)
      : "";
    const renderedPrompt = renderPromptTemplate(scenario.promptTemplate, {
      ...variables,
      input: dto.input.trim(),
      knowledge: knowledgeContext
    });

    return {
      variables,
      renderedPrompt,
      knowledgeBaseId,
      knowledgeContext
    };
  }

  private validateScenarioInputSchema(
    scenario: AiScenarioRecord,
    input: string,
    variables: Record<string, string>
  ) {
    const schema = this.normalizeInputSchema(scenario.inputSchema, false);

    if (!schema) {
      return variables;
    }

    const normalized = {
      ...variables
    };

    for (const field of schema.fields) {
      if (field.type === "audio-preview") {
        continue;
      }

      const rawValue = field.name === "input" ? input : normalized[field.name] ?? "";
      const value = String(rawValue ?? "").trim();

      if (field.required && !value) {
        throw new AppException(40001, `请填写${field.label}`, HttpStatus.BAD_REQUEST);
      }

      if (!value && field.type !== "switch") {
        continue;
      }

      if (field.type === "number" || field.type === "slider") {
        const numberValue = Number(value);

        if (!Number.isFinite(numberValue)) {
          throw new AppException(40001, `${field.label}必须是数字`, HttpStatus.BAD_REQUEST);
        }

        if (field.min !== undefined && numberValue < field.min) {
          throw new AppException(40001, `${field.label}不能小于 ${field.min}`, HttpStatus.BAD_REQUEST);
        }

        if (field.max !== undefined && numberValue > field.max) {
          throw new AppException(40001, `${field.label}不能大于 ${field.max}`, HttpStatus.BAD_REQUEST);
        }

        if (field.name !== "input") {
          normalized[field.name] = String(numberValue);
        }
      }

      if (
        (field.type === "select" || field.type === "format-select") &&
        value &&
        field.options.length > 0 &&
        !field.options.includes(value)
      ) {
        throw new AppException(40001, `${field.label}选项无效`, HttpStatus.BAD_REQUEST);
      }

      if (field.type === "switch" && field.name !== "input") {
        normalized[field.name] = isTruthySwitchValue(value) ? "是" : "否";
      }
    }

    return normalized;
  }

  private normalizeInputSchema(value: unknown, strict: true): ToolInputSchema;
  private normalizeInputSchema(value: unknown, strict: false): ToolInputSchema | null;
  private normalizeInputSchema(value: unknown, strict: boolean): ToolInputSchema | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      if (strict) {
        throw new AppException(40001, "输入表单 schema 必须是对象", HttpStatus.BAD_REQUEST);
      }

      return null;
    }

    const fields = (value as Record<string, unknown>).fields;

    if (!Array.isArray(fields) || fields.length === 0 || fields.length > 20) {
      if (strict) {
        throw new AppException(40001, "输入表单 schema 至少需要 1 个字段，最多 20 个字段", HttpStatus.BAD_REQUEST);
      }

      return null;
    }

    const normalizedFields: ToolInputField[] = [];
    const names = new Set<string>();

    for (const field of fields) {
      if (!field || typeof field !== "object" || Array.isArray(field)) {
        if (strict) {
          throw new AppException(40001, "输入字段配置格式不正确", HttpStatus.BAD_REQUEST);
        }

        continue;
      }

      const record = field as Record<string, unknown>;
      const name = String(record.name ?? "").trim();
      const label = String(record.label ?? "").trim();
      const type = String(record.type ?? "").trim() as ToolInputFieldType;

      if (!/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/.test(name)) {
        if (strict) {
          throw new AppException(40001, "输入字段 name 只能使用字母、数字和下划线，并以字母开头", HttpStatus.BAD_REQUEST);
        }

        continue;
      }

      if (names.has(name)) {
        if (strict) {
          throw new AppException(40001, `输入字段重复：${name}`, HttpStatus.BAD_REQUEST);
        }

        continue;
      }

      if (!label || label.length > 60) {
        if (strict) {
          throw new AppException(40001, "输入字段 label 不能为空且不能超过 60 个字符", HttpStatus.BAD_REQUEST);
        }

        continue;
      }

      if (!isToolInputFieldType(type)) {
        if (strict) {
          throw new AppException(
            40001,
            "输入字段 type 只支持 text、textarea、select、number、switch、voice-select、audio-upload、slider、audio-preview、format-select",
            HttpStatus.BAD_REQUEST
          );
        }

        continue;
      }

      const options = Array.isArray(record.options)
        ? record.options.map((option) => String(option ?? "").trim()).filter(Boolean).slice(0, 20)
        : [];

      const normalizedOptions = type === "format-select" && options.length === 0 ? ["mp3", "wav", "opus"] : options;

      if ((type === "select" || type === "format-select") && normalizedOptions.length === 0) {
        if (strict) {
          throw new AppException(40001, `${label} 的选项不能为空`, HttpStatus.BAD_REQUEST);
        }

        continue;
      }

      const min = optionalNumber(record.min);
      const max = optionalNumber(record.max);
      const maxSizeMb = optionalNumber(record.maxSizeMb);

      if (min !== undefined && max !== undefined && min > max) {
        if (strict) {
          throw new AppException(40001, `${label} 的最小值不能大于最大值`, HttpStatus.BAD_REQUEST);
        }

        continue;
      }

      if (type === "slider" && (min === undefined || max === undefined)) {
        if (strict) {
          throw new AppException(40001, `${label} 的 slider 必须配置 min 和 max`, HttpStatus.BAD_REQUEST);
        }

        continue;
      }

      names.add(name);
      normalizedFields.push({
        name,
        label,
        type,
        required: record.required === true,
        placeholder: String(record.placeholder ?? "").trim().slice(0, 200),
        options: normalizedOptions,
        min,
        max,
        defaultValue: normalizedDefaultValue(record.default, type),
        accept: normalizeStringArray(record.accept, 20),
        maxSizeMb: maxSizeMb === undefined ? undefined : Math.max(1, Math.min(200, Math.round(maxSizeMb)))
      });
    }

    if (normalizedFields.length === 0) {
      if (strict) {
        throw new AppException(40001, "输入表单 schema 没有可用字段", HttpStatus.BAD_REQUEST);
      }

      return null;
    }

    return {
      fields: normalizedFields
    };
  }

  private normalizeVariables(input: Record<string, unknown> | undefined) {
    const variables: Record<string, string> = {};

    if (!input) {
      return variables;
    }

    for (const [key, value] of Object.entries(input)) {
      if (!/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/.test(key)) {
        continue;
      }

      const normalized = String(value ?? "").trim();

      if (normalized) {
        variables[key] = normalized.slice(0, 2000);
      }
    }

    return variables;
  }

  private promptVariables(scenario: AiScenarioRecord) {
    const raw = scenario.promptVariables;

    if (!Array.isArray(raw)) {
      return [];
    }

    return raw
      .map((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          return null;
        }

        const record = item as Record<string, unknown>;
        const name = String(record.name ?? "").trim();

        if (!/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/.test(name)) {
          return null;
        }

        return {
          name,
          label: String(record.label ?? name).trim() || name,
          required: record.required !== false,
          placeholder: String(record.placeholder ?? "").trim()
        };
      })
      .filter((item): item is { name: string; label: string; required: boolean; placeholder: string } => Boolean(item));
  }

  private async retrieveKnowledgeContext(userId: string, knowledgeBaseId: string, query: string) {
    const knowledgeBase = await this.prisma.knowledgeBase.findFirst({
      where: {
        id: knowledgeBaseId,
        userId
      },
      select: {
        id: true
      }
    });

    if (!knowledgeBase) {
      throw new AppException(40401, "知识库不存在", HttpStatus.NOT_FOUND);
    }

    const chunks = await this.searchKnowledgeChunks(userId, knowledgeBaseId, query, 4);

    if (chunks.length === 0) {
      return "";
    }

    return chunks.map((chunk, index) => `片段 ${index + 1}：${chunk.content}`).join("\n\n");
  }

  private async searchKnowledgeChunks(userId: string, knowledgeBaseId: string, query: string, take = 5) {
    const words = keywordTokens(query);
    const chunks = await this.prisma.knowledgeChunk.findMany({
      where: {
        document: {
          knowledgeBase: {
            id: knowledgeBaseId,
            userId
          },
          status: "READY"
        }
      },
      include: {
        document: true
      },
      orderBy: {
        sortOrder: "asc"
      },
      take: 200
    });

    return chunks
      .map((chunk) => ({
        ...chunk,
        score: scoreText(chunk.content, words)
      }))
      .filter((chunk) => chunk.score > 0)
      .sort((first, second) => second.score - first.score || first.sortOrder - second.sortOrder)
      .slice(0, take);
  }

  private async reserveCredits(
    userId: string,
    scenario: AiScenarioRecord,
    input: string,
    activeModel: ActiveAiModel | null,
    promptInput: {
      variables: Record<string, string>;
      renderedPrompt: string;
      knowledgeBaseId: string | null;
      knowledgeContext: string;
    }
  ) {
    const saveFullContent = await this.shouldSaveFullAiContent();
    const inputPreview = contentPreview(input, 500);
    const knowledgeContextPreview = contentPreview(promptInput.knowledgeContext, 800);
    const renderedPromptPreview = contentPreview(promptInput.renderedPrompt, 1000);

    return this.prisma.$transaction(async (transaction) => {
      const task = await transaction.aiTask.create({
        data: {
          userId,
          scenarioId: scenario.id,
          aiProviderId: activeModel?.providerId ?? null,
          aiModelId: activeModel?.providerId ? activeModel.id : null,
          aiProviderInstanceId: activeModel?.providerInstanceId ?? null,
          aiModelInstanceId: activeModel?.modelInstanceId ?? null,
          providerName: activeModel?.provider.name,
          modelName: activeModel?.modelName,
          status: "CREATED",
          input: {
            text: saveFullContent ? input : inputPreview,
            variables: promptInput.variables,
            knowledgeBaseId: promptInput.knowledgeBaseId,
            knowledgeContext: saveFullContent ? promptInput.knowledgeContext : knowledgeContextPreview
          },
          knowledgeBaseId: promptInput.knowledgeBaseId,
          renderedPrompt: saveFullContent ? promptInput.renderedPrompt : renderedPromptPreview,
          inputPreview,
          inputHash: contentHash(input),
          saveFullContent,
          estimatedCredits: scenario.costCredits
        }
      });

      await this.ensureWallet(transaction, userId);

      const walletChanged = await transaction.wallet.updateMany({
        where: {
          userId,
          availableCredits: {
            gte: scenario.costCredits
          }
        },
        data: {
          availableCredits: {
            decrement: scenario.costCredits
          },
          frozenCredits: {
            increment: scenario.costCredits
          }
        }
      });

      if (walletChanged.count === 0) {
        throw new AppException(40004, "点数余额不足，请先充值", HttpStatus.BAD_REQUEST);
      }

      const wallet = await transaction.wallet.findUniqueOrThrow({
        where: {
          userId
        }
      });

      await transaction.creditReservation.create({
        data: {
          userId,
          taskId: task.id,
          amount: scenario.costCredits,
          status: "RESERVED",
          idempotencyKey: `ai-task:${task.id}:reserve`,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000)
        }
      });

      await transaction.ledgerEntry.create({
        data: {
          userId,
          type: "RESERVE",
          amount: -scenario.costCredits,
          balanceAfter: wallet.availableCredits,
          relatedTaskId: task.id,
          idempotencyKey: `ai-task:${task.id}:ledger-reserve`,
          note: `${scenario.name}冻结 ${scenario.costCredits} 点`
        }
      });

      return transaction.aiTask.update({
        where: {
          id: task.id
        },
        data: {
          status: "RESERVED"
        }
      });
    });
  }

  private async settleSuccessfulTask(taskId: string, result: ProviderResult, actualCredits: number) {
    return this.prisma.$transaction(async (transaction) => {
      const task = await transaction.aiTask.findUnique({
        where: {
          id: taskId
        },
        include: {
          scenario: true,
          reservation: true
        }
      });

      if (!task || !task.reservation) {
        throw new AppException(40401, "AI 任务不存在", HttpStatus.NOT_FOUND);
      }

      const reservation = task.reservation;

      if (reservation.status !== "RESERVED") {
        return this.toTask(task);
      }

      const settledCredits = Math.min(actualCredits, reservation.amount);
      const releaseCredits = Math.max(0, reservation.amount - settledCredits);
      const currentWallet = await transaction.wallet.findUniqueOrThrow({
        where: {
          userId: task.userId
        }
      });

      const wallet = await transaction.wallet.update({
        where: {
          userId: task.userId
        },
        data: {
          availableCredits: {
            increment: releaseCredits
          },
          frozenCredits: {
            decrement: reservation.amount
          },
          totalConsumedCredits: {
            increment: settledCredits
          }
        }
      });

      await transaction.creditReservation.update({
        where: {
          id: reservation.id
        },
        data: {
          status: "SETTLED"
        }
      });

      await transaction.ledgerEntry.create({
        data: {
          userId: task.userId,
          type: "CONSUME",
          amount: -settledCredits,
          balanceAfter: currentWallet.availableCredits,
          relatedTaskId: task.id,
          idempotencyKey: `ai-task:${task.id}:consume`,
          note: `${task.scenario.name}消耗 ${settledCredits} 点`
        }
      });

      if (releaseCredits > 0) {
        await transaction.ledgerEntry.create({
          data: {
            userId: task.userId,
            type: "RELEASE",
            amount: releaseCredits,
            balanceAfter: wallet.availableCredits,
            relatedTaskId: task.id,
            idempotencyKey: `ai-task:${task.id}:release`,
            note: `${task.scenario.name}释放多余冻结 ${releaseCredits} 点`
          }
        });
      }

      const outputPreview = contentPreview(result.text, 1000);
      const updatedTask = await transaction.aiTask.update({
        where: {
          id: task.id
        },
        data: {
          status: "SUCCEEDED",
          output: task.saveFullContent ? result.text : outputPreview,
          outputPreview,
          outputHash: contentHash(result.text),
          errorMessage: null,
          actualCredits: settledCredits,
          providerName: result.provider ?? task.providerName,
          modelName: result.model ?? task.modelName,
          inputTokens: normalizedUsage(result.usage).inputTokens,
          outputTokens: normalizedUsage(result.usage).outputTokens,
          totalTokens: normalizedUsage(result.usage).totalTokens,
          finishedAt: new Date()
        },
        include: {
          scenario: true,
          reservation: true
        }
      });

      return this.toTask(updatedTask);
    });
  }

  private async releaseFailedTask(taskId: string, errorMessage: string) {
    return this.prisma.$transaction(async (transaction) => {
      const task = await transaction.aiTask.findUnique({
        where: {
          id: taskId
        },
        include: {
          scenario: true,
          reservation: true
        }
      });

      if (!task || !task.reservation) {
        throw new AppException(40401, "AI 任务不存在", HttpStatus.NOT_FOUND);
      }

      const reservation = task.reservation;

      if (reservation.status === "RESERVED") {
        const wallet = await transaction.wallet.update({
          where: {
            userId: task.userId
          },
          data: {
            availableCredits: {
              increment: reservation.amount
            },
            frozenCredits: {
              decrement: reservation.amount
            }
          }
        });

        await transaction.creditReservation.update({
          where: {
            id: reservation.id
          },
          data: {
            status: "RELEASED"
          }
        });

        await transaction.ledgerEntry.create({
          data: {
            userId: task.userId,
            type: "RELEASE",
            amount: reservation.amount,
            balanceAfter: wallet.availableCredits,
            relatedTaskId: task.id,
            idempotencyKey: `ai-task:${task.id}:release-failed`,
            note: `${task.scenario.name}失败释放冻结 ${reservation.amount} 点`
          }
        });
      }

      const updatedTask = await transaction.aiTask.update({
        where: {
          id: task.id
        },
        data: {
          status: "FAILED",
          errorMessage,
          finishedAt: new Date()
        },
        include: {
          scenario: true,
          reservation: true
        }
      });

      return this.toTask(updatedTask);
    });
  }

  private async cancelTask(taskId: string, errorMessage: string) {
    return this.prisma.$transaction(async (transaction) => {
      const task = await transaction.aiTask.findUnique({
        where: {
          id: taskId
        },
        include: {
          scenario: true,
          reservation: true
        }
      });

      if (!task || !task.reservation) {
        throw new AppException(40401, "AI 任务不存在", HttpStatus.NOT_FOUND);
      }

      if (task.reservation.status === "RESERVED") {
        const wallet = await transaction.wallet.update({
          where: {
            userId: task.userId
          },
          data: {
            availableCredits: {
              increment: task.reservation.amount
            },
            frozenCredits: {
              decrement: task.reservation.amount
            }
          }
        });

        await transaction.creditReservation.update({
          where: {
            id: task.reservation.id
          },
          data: {
            status: "RELEASED"
          }
        });

        await transaction.ledgerEntry.create({
          data: {
            userId: task.userId,
            type: "RELEASE",
            amount: task.reservation.amount,
            balanceAfter: wallet.availableCredits,
            relatedTaskId: task.id,
            idempotencyKey: `ai-task:${task.id}:release-cancelled`,
            note: `${task.scenario.name}中断释放冻结 ${task.reservation.amount} 点`
          }
        });
      }

      const updatedTask = await transaction.aiTask.update({
        where: {
          id: task.id
        },
        data: {
          status: "CANCELLED",
          errorMessage,
          finishedAt: new Date()
        },
        include: {
          scenario: true,
          reservation: true
        }
      });

      return this.toTask(updatedTask);
    });
  }

  private async ensureWallet(transaction: Prisma.TransactionClient, userId: string) {
    return transaction.wallet.upsert({
      where: {
        userId
      },
      update: {},
      create: {
        userId
      }
    });
  }

  private async ensureExperienceChatScenario() {
    return this.prisma.aiScenario.upsert({
      where: {
        slug: "experience-ai-chat"
      },
      update: {
        promptTemplate: this.experienceChatPromptTemplate(),
        promptVariables: [
          {
            name: "history",
            label: "历史对话",
            required: false,
            placeholder: ""
          }
        ],
        requiredCapabilities: ["TEXT", "STREAMING"],
        costCredits: 0,
        isEnabled: true,
        templateVersion: "2026.05.17"
      },
      create: {
        name: "AI 对话",
        slug: "experience-ai-chat",
        description: "体验区基础 AI 对话能力。",
        promptTemplate: this.experienceChatPromptTemplate(),
        promptVariables: [
          {
            name: "history",
            label: "历史对话",
            required: false,
            placeholder: ""
          }
        ],
        requiredCapabilities: ["TEXT", "STREAMING"],
        costCredits: 0,
        isEnabled: true,
        sortOrder: 0,
        isBuiltIn: true,
        templateVersion: "2026.05.17"
      },
      include: {
        modelBinding: true
      }
    });
  }

  private experienceChatPromptTemplate() {
    return [
      "你是 AI SaaS 体验区中的中文 AI 助手。",
      "请使用简体中文回答，优先给出清晰、可执行、结构化的回复。",
      "如果历史对话为空，就直接回答用户最新问题。",
      "",
      "输出格式必须严格遵守：",
      "1. 只输出合法 GitHub Flavored Markdown，不要把多个标题、段落或列表项挤在同一行。",
      "2. 标题必须单独成行，使用 `## 标题` 或 `### 标题`，井号后必须有一个空格。",
      "3. 列表项必须单独成行，使用 `- 内容`；不要输出空列表项。",
      "4. 加粗标签使用 `**公式**：`、`**说明**：` 这种完整配对格式，禁止输出 `公式*：`、`*公式：`、`*示例：`。",
      "5. `**公式**：` 和 `**说明**：` 必须作为独立段落，不要写成 `标题**公式**：`、`\\]**说明**：` 或 `说明内容### 下一标题`。",
      "",
      "数学公式必须严格遵守：",
      "1. 行内公式只使用 `\\( ... \\)`。",
      "2. 独立公式块只使用下面格式，公式块前后保留空行：",
      "\\[",
      "...",
      "\\]",
      "3. 禁止使用 `$...$` 或 `$$...$$`。",
      "4. 禁止输出 `\\left$`、`\\right$`；需要括号时使用 `\\left(` 和 `\\right)`。",
      "5. TeX 命令和变量需要分开，写 `\\partial F_x`、`\\partial x`、`\\approx x`，不要写 `\\partialF_x`、`\\partialx`、`\\approxx`。",
      "6. 多变量微积分公式优先使用这些写法：",
      "\\[",
      "\\nabla f = \\left(\\frac{\\partial f}{\\partial x}, \\frac{\\partial f}{\\partial y}, \\frac{\\partial f}{\\partial z}\\right)",
      "\\]",
      "\\[",
      "\\nabla \\cdot \\mathbf{F} = \\frac{\\partial F_x}{\\partial x} + \\frac{\\partial F_y}{\\partial y} + \\frac{\\partial F_z}{\\partial z}",
      "\\]",
      "\\[",
      "\\nabla \\times \\mathbf{F} = \\left(\\frac{\\partial F_z}{\\partial y} - \\frac{\\partial F_y}{\\partial z}, \\frac{\\partial F_x}{\\partial z} - \\frac{\\partial F_z}{\\partial x}, \\frac{\\partial F_y}{\\partial x} - \\frac{\\partial F_x}{\\partial y}\\right)",
      "\\]",
      "7. 回复前自检：不能留下未配对的 `$`、`\\[`、`\\]`，不能留下红色错误公式或裸露的 TeX 命令。",
      "",
      "历史对话：",
      "{{history}}",
      "",
      "用户最新问题：",
      "{{input}}"
    ].join("\n");
  }

  private normalizeChatHistory(messages: CreateAiChatDto["messages"]) {
    if (!Array.isArray(messages)) {
      return "无";
    }

    const history = messages
      .slice(-12)
      .map((message) => {
        const role = message?.role === "assistant" ? "AI" : "用户";
        const content = String(message?.content ?? "").trim().slice(0, 1000);

        return content ? `${role}：${content}` : "";
      })
      .filter(Boolean)
      .join("\n");

    return history || "无";
  }

  private async streamGenerateText(
    input: string,
    prompt: string,
    scenario: AiScenarioRecord,
    taskId: string,
    activeModel: ActiveAiModel | null,
    onEvent: (event: Record<string, unknown>) => void,
    attachments: ProviderTextAttachment[] = [],
    signal?: AbortSignal,
    options: TextGenerationOptions = {}
  ): Promise<ProviderResult> {
    if (activeModel) {
      const adapter = getProviderAdapter(activeModel.adapterType);
      const reasoningSwitchSupported = modelHasCapability(activeModel, "REASONING");
      const reasoningEnabled = Boolean(options.reasoningEnabled && reasoningSwitchSupported);
      const searchEnabled = Boolean(options.searchEnabled && modelHasAnyCapability(activeModel, ["SEARCH", "WEB_SEARCH", "BROWSING", "TOOLS"]));

      try {
        const result = await adapter.streamText({
          gatewayBaseUrl: process.env.AI_GATEWAY_BASE_URL ?? "http://localhost:7343",
          scenarioSlug: scenario.slug,
          baseUrl: activeModel.provider.baseUrl,
          apiKeyEncrypted: activeModel.provider.apiKeyEncrypted,
          modelName: activeModel.modelName,
          prompt,
          input,
          temperature: aiTemperature(),
          maxTokens: aiMaxTokens(),
          timeoutMs: aiGatewayTimeoutMs(),
          attachments,
          reasoningSwitchSupported,
          reasoningEnabled,
          searchEnabled,
          signal,
          onDelta: (text) => {
            onEvent({
              type: "delta",
              text
            });
          },
          onReasoningDelta: (text) => {
            onEvent({
              type: "reasoning_delta",
              text
            });
          }
        });

        await this.writeAiCallLog(taskId, activeModel, {
          latencyMs: result.latencyMs ?? null,
          success: true,
          requestId: result.requestId ?? null,
          usage: result.usage,
          errorCode: null,
          errorMessage: null
        });

        return {
          ...result,
          provider: result.provider || activeModel.provider.name,
          model: result.model || activeModel.modelName,
          billingModel: activeModel
        };
      } catch (error) {
        const adapterError = error instanceof ProviderAdapterException ? error : null;

        await this.writeAiCallLog(taskId, activeModel, {
          success: false,
          errorCode: adapterError?.code ?? "AI_GATEWAY_STREAM_ERROR",
          errorMessage: adapterError?.message ?? "AI Gateway 流式调用失败"
        });

        if (error instanceof AppException) {
          throw error;
        }

        throw new AppException(50201, "AI 流式生成失败，请稍后重试", HttpStatus.BAD_GATEWAY);
      }
    }

    const startedAt = Date.now();

    try {
      const result = this.mockGenerate(input, scenario, prompt);
      onEvent({
        type: "delta",
        text: result.text
      });
      await this.writeMockCallLog(taskId, {
        latencyMs: Date.now() - startedAt,
        success: true,
        errorCode: null,
        errorMessage: null
      });

      return {
        ...result,
        latencyMs: Date.now() - startedAt
      };
    } catch (error) {
      await this.writeMockCallLog(taskId, {
        latencyMs: Date.now() - startedAt,
        success: false,
        errorCode: "MOCK_STREAM_FAILED",
        errorMessage: this.providerErrorMessage(error)
      });
      throw error;
    }
  }

  private async generateTextWithFallback(
    input: string,
    prompt: string,
    scenario: AiScenarioRecord,
    taskId: string,
    activeModel: ActiveAiModel | null,
    attachments: ProviderTextAttachment[] = []
  ): Promise<ProviderResult> {
    try {
      return await this.generateText(input, prompt, scenario, taskId, activeModel, attachments);
    } catch (error) {
      const fallbackModelAlias = scenario.modelBinding?.fallbackModelAlias || activeModel?.fallbackModelAlias;

      if (fallbackModelAlias && activeModel) {
        const fallbackModel = await this.getModelByAlias(fallbackModelAlias, scenario, false);

        if (fallbackModel && fallbackModel.id !== activeModel.id) {
          await this.writeAiCallLog(taskId, fallbackModel, {
            success: false,
            errorCode: "FALLBACK_STARTED",
            errorMessage: `主模型 ${activeModel.modelName} 失败，开始 fallback`
          });

          return this.generateText(input, prompt, scenario, taskId, fallbackModel, attachmentsForModel(fallbackModel, attachments));
        }
      }

      const fallbackModelId = scenario.fallbackModelId || activeModel?.fallbackModelId;

      if (!fallbackModelId || !activeModel) {
        throw error;
      }

      const fallbackModel = await this.getModelById(fallbackModelId);

      if (!fallbackModel || fallbackModel.id === activeModel.id) {
        throw error;
      }

      await this.writeAiCallLog(taskId, fallbackModel, {
        success: false,
        errorCode: "FALLBACK_STARTED",
        errorMessage: `主模型 ${activeModel.modelName} 失败，开始 fallback`
      });

      return this.generateText(input, prompt, scenario, taskId, fallbackModel, attachmentsForModel(fallbackModel, attachments));
    }
  }

  private async generateText(
    input: string,
    prompt: string,
    scenario: AiScenarioRecord,
    taskId: string,
    activeModel: ActiveAiModel | null,
    attachments: ProviderTextAttachment[] = []
  ): Promise<ProviderResult> {
    if (!activeModel) {
      const startedAt = Date.now();

      try {
        const result = this.mockGenerate(input, scenario, prompt);

        await this.writeMockCallLog(taskId, {
          success: true,
          latencyMs: Date.now() - startedAt,
          errorCode: null,
          errorMessage: null
        });

        return result;
      } catch (error) {
        await this.writeMockCallLog(taskId, {
          success: false,
          latencyMs: Date.now() - startedAt,
          errorCode: "MOCK_GENERATION_FAILED",
          errorMessage: this.providerErrorMessage(error)
        });
        throw error;
      }
    }

    const adapter = getProviderAdapter(activeModel.adapterType);

    try {
      const result = await adapter.generateText({
        gatewayBaseUrl: process.env.AI_GATEWAY_BASE_URL ?? "http://localhost:7343",
        scenarioSlug: scenario.slug,
        baseUrl: activeModel.provider.baseUrl,
        apiKeyEncrypted: activeModel.provider.apiKeyEncrypted,
        modelName: activeModel.modelName,
        prompt,
        input,
        temperature: aiTemperature(),
        maxTokens: aiMaxTokens(),
        timeoutMs: aiGatewayTimeoutMs(),
        attachments
      });

      await this.writeAiCallLog(taskId, activeModel, {
        latencyMs: result.latencyMs ?? null,
        success: true,
        requestId: result.requestId ?? null,
        usage: result.usage,
        errorCode: null,
        errorMessage: null
      });

      return {
        ...result,
        provider: result.provider || activeModel.provider.name,
        model: result.model || activeModel.modelName,
        billingModel: activeModel
      };
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }

      const adapterError = error instanceof ProviderAdapterException ? error : null;

      await this.writeAiCallLog(taskId, activeModel, {
        success: false,
        errorCode: adapterError?.code ?? "AI_GATEWAY_ERROR",
        errorMessage: adapterError?.message ?? "AI Gateway 调用失败"
      });
      throw new AppException(50201, "AI 生成失败，请稍后重试", HttpStatus.BAD_GATEWAY);
    }
  }

  private mockGenerate(input: string, scenario: AiScenarioRecord, prompt?: string): ProviderResult {
    if (this.shouldSimulateFailure(input)) {
      throw new AppException(50201, "AI 生成失败，请稍后重试", HttpStatus.BAD_GATEWAY);
    }

    if (scenario.slug === "experience-ai-chat") {
      const text = [
        `我理解你的问题是：${input}`,
        "",
        "这是体验区的基础 AI 对话能力，适合快速验证模型选择、上下文对话和流式输出是否正常。",
        "后续可以在这个栏目继续扩展联网搜索、文件问答、图片理解、语音对话等更多 AI 能力。"
      ].join("\n");

      return {
        text,
        usage: estimateMockTokenUsage(prompt ?? input, text),
        usageCredits: estimateMockUsageCredits(prompt ?? input, scenario.costCredits),
        billingModel: null
      };
    }

    const promptPreview = prompt && prompt !== input ? `\n\n已渲染 Prompt：${prompt.slice(0, 220)}` : "";
    const text = [
      `主题：${input}`,
      "",
      "这是一版面向简体中文用户的运营文案草稿，建议先突出用户痛点，再用清晰的产品收益承接行动。",
      "",
      "推荐表达：",
      `- 用一句话说明「${input}」能解决什么问题。`,
      "- 补充 2-3 个具体使用场景，避免空泛承诺。",
      "- 结尾引导用户进入工具页或立即保存草稿。",
      promptPreview
    ].join("\n");

    return {
      text,
      usage: estimateMockTokenUsage(prompt ?? input, text),
      usageCredits: estimateMockUsageCredits(prompt ?? input, scenario.costCredits),
      billingModel: null
    };
  }

  private normalizeActualCredits(
    input: string,
    scenario: AiScenarioRecord,
    activeModel: ActiveAiModel | null,
    result: ProviderResult
  ) {
    if (typeof result.usageCredits === "number" && Number.isFinite(result.usageCredits)) {
      return Math.max(1, Math.min(scenario.costCredits, Math.ceil(result.usageCredits)));
    }

    if (!activeModel) {
      return estimateMockUsageCredits(input, scenario.costCredits);
    }

    return getProviderAdapter(activeModel.adapterType).calculateUsage({
      usage: result.usage,
      inputPrice: Number(activeModel.inputPrice.toString()),
      outputPrice: Number(activeModel.outputPrice.toString()),
      fallbackCredits: scenario.costCredits,
      maxCredits: scenario.costCredits
    });
  }

  private async getActiveModel(): Promise<ActiveAiModel | null> {
    return this.prisma.aiModel.findFirst({
      where: {
        isEnabled: true,
        provider: {
          isEnabled: true
        }
      },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            baseUrl: true,
            apiKeyEncrypted: true
          }
        }
      },
      orderBy: [
        {
          updatedAt: "desc"
        },
        {
          createdAt: "desc"
        }
      ]
    });
  }

  private async getModelForScenario(
    scenario: AiScenarioRecord,
    selectedModelInstanceId?: string | null
  ): Promise<ActiveAiModel | null> {
    const normalizedSelectedModelId = selectedModelInstanceId?.trim();

    if (normalizedSelectedModelId === "mock") {
      return null;
    }

    if (normalizedSelectedModelId) {
      return this.getModelByInstanceId(normalizedSelectedModelId, scenario);
    }

    if (scenario.modelBinding?.defaultModelAlias) {
      return this.getModelByAlias(scenario.modelBinding.defaultModelAlias, scenario, true);
    }

    if (scenario.defaultModelId) {
      const model = await this.getModelById(scenario.defaultModelId);

      if (model) {
        return model;
      }
    }

    return this.getActiveModel();
  }

  private async getModelByInstanceId(
    modelInstanceId: string,
    scenario: AiScenarioRecord
  ): Promise<ActiveAiModel> {
    const model = await this.prisma.aiModelInstance.findUnique({
      where: {
        id: modelInstanceId
      },
      include: {
        providerInstance: {
          include: {
            providerPreset: true,
            credential: true
          }
        }
      }
    });

    if (!model) {
      throw new AppException(40401, "所选模型不存在", HttpStatus.NOT_FOUND);
    }

    return this.activeModelFromInstance(model, scenario, null);
  }

  private async getModelByAlias(
    aliasKey: string,
    scenario: AiScenarioRecord,
    required: boolean
  ): Promise<ActiveAiModel | null> {
    const alias = await this.prisma.aiModelAlias.findUnique({
      where: {
        aliasKey
      },
      include: {
        modelInstance: {
          include: {
            providerInstance: {
              include: {
                providerPreset: true,
                credential: true
              }
            }
          }
        }
      }
    });

    if (!alias?.modelInstance) {
      if (!required) {
        return null;
      }

      throw new AppException(
        40001,
        aliasKey === "default-chat"
          ? "当前未配置默认聊天模型，请在后台 AI 模型设置中完成配置。"
          : `模型别名 ${aliasKey} 未配置，请在后台 AI 模型设置中完成配置。`,
        HttpStatus.BAD_REQUEST
      );
    }

    return this.activeModelFromInstance(alias.modelInstance, scenario, aliasKey);
  }

  private activeModelFromInstance(
    model: {
      id: string;
      displayName: string;
      providerModelName: string;
      capabilityTags: Prisma.JsonValue;
      inputPrice: { toString(): string };
      outputPrice: { toString(): string };
      isEnabled: boolean;
      providerInstance: {
        id: string;
        name: string;
        baseUrl: string;
        status: string;
        credential: {
          apiKeyEncrypted: string;
        } | null;
        providerPreset: {
          adapterType: ProviderAdapterType;
        };
      };
    },
    scenario: AiScenarioRecord,
    aliasKey: string | null
  ): ActiveAiModel {
    const providerInstance = model.providerInstance;

    if (!model.isEnabled || providerInstance.status !== "ENABLED") {
      throw new AppException(40001, "当前模型或 Provider 未启用，请在后台 AI 模型设置中检查配置。", HttpStatus.BAD_REQUEST);
    }

    if (!providerInstance.credential) {
      throw new AppException(40001, "当前 Provider 尚未配置 API Key，请在后台填写后再试。", HttpStatus.BAD_REQUEST);
    }

    const missing = missingCapabilities(
      jsonStringArray(scenario.requiredCapabilities),
      jsonStringArray(model.capabilityTags)
    );

    if (missing.length > 0) {
      throw new AppException(
        40001,
        `当前模型不支持${missing.map(capabilityLabel).join("、")}，请重新选择模型或在后台调整配置。`,
        HttpStatus.BAD_REQUEST
      );
    }

    return {
      id: model.id,
      providerId: null,
      providerInstanceId: providerInstance.id,
      modelInstanceId: model.id,
      fallbackModelId: null,
      fallbackModelAlias: scenario.modelBinding?.fallbackModelAlias ?? null,
      aliasKey,
      adapterType: providerInstance.providerPreset.adapterType,
      displayName: model.displayName,
      modelName: model.providerModelName,
      capabilityTags: jsonStringArray(model.capabilityTags),
      inputPrice: model.inputPrice,
      outputPrice: model.outputPrice,
      provider: {
        id: null,
        instanceId: providerInstance.id,
        name: providerInstance.name,
        baseUrl: providerInstance.baseUrl,
        apiKeyEncrypted: providerInstance.credential.apiKeyEncrypted
      }
    };
  }

  private async getModelById(id: string): Promise<ActiveAiModel | null> {
    return this.prisma.aiModel.findFirst({
      where: {
        id,
        isEnabled: true,
        provider: {
          isEnabled: true
        }
      },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            baseUrl: true,
            apiKeyEncrypted: true
          }
        }
      }
    });
  }

  private async assertToolCategorySlugAvailable(slug: string, excludeId?: string) {
    const existing = await this.prisma.aiToolCategory.findUnique({
      where: {
        slug
      }
    });

    if (existing && existing.id !== excludeId) {
      throw new AppException(40002, "工具分类 slug 已存在", HttpStatus.BAD_REQUEST);
    }
  }

  private async assertToolCategoryExists(id: string | undefined) {
    const normalized = emptyToNull(id);

    if (!normalized) {
      return;
    }

    const category = await this.prisma.aiToolCategory.findUnique({
      where: {
        id: normalized
      },
      select: {
        id: true
      }
    });

    if (!category) {
      throw new AppException(40001, "工具分类不存在", HttpStatus.BAD_REQUEST);
    }
  }

  private async ensureToolCategory(input: NormalizedToolTemplateImport["category"]) {
    const existing = await this.prisma.aiToolCategory.findUnique({
      where: {
        slug: input.slug
      }
    });

    if (existing) {
      return existing;
    }

    return this.prisma.aiToolCategory.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description,
        sortOrder: input.sortOrder,
        isVisible: input.isVisible
      }
    });
  }

  private normalizeToolTemplateImport(payload: Record<string, unknown>) {
    const rawTemplates = rawTemplateItems(payload);

    if (rawTemplates.length === 0 || rawTemplates.length > 100) {
      throw new AppException(40001, "工具模板导入数量必须在 1 到 100 个之间", HttpStatus.BAD_REQUEST);
    }

    const slugs = new Set<string>();

    return rawTemplates.map((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        throw new AppException(40001, `第 ${index + 1} 个工具模板格式不正确`, HttpStatus.BAD_REQUEST);
      }

      const record = item as Record<string, unknown>;
      assertToolTemplateHasNoSecrets(record);
      const name = String(record.name ?? "").trim();
      const slug = String(record.slug ?? record.toolKey ?? "").trim();
      const promptTemplate = String(record.promptTemplate ?? "").trim();

      if (!name || name.length > 80) {
        throw new AppException(40001, `第 ${index + 1} 个工具名称不能为空且不能超过 80 个字符`, HttpStatus.BAD_REQUEST);
      }

      assertValidSlug(slug);

      if (slugs.has(slug)) {
        throw new AppException(40001, `导入文件中存在重复 slug：${slug}`, HttpStatus.BAD_REQUEST);
      }

      if (!promptTemplate || promptTemplate.length > 8000) {
        throw new AppException(40001, `${name} 的 Prompt 模板不能为空且不能超过 8000 个字符`, HttpStatus.BAD_REQUEST);
      }

      slugs.add(slug);

      return {
        name,
        slug,
        description: nullableString(record.description, 240),
        category: normalizeImportCategory(record.category, record.categorySlug),
        inputSchema: this.normalizeInputSchema(record.inputSchema, true),
        promptTemplate,
        defaultModelAlias:
          String(record.defaultModelAlias ?? record.modelAlias ?? "default-chat").trim() || "default-chat",
        fallbackModelAlias: emptyToNull(String(record.fallbackModelAlias ?? "")),
        requiredCapabilities: normalizeCapabilityTags(
          Array.isArray(record.requiredCapabilities) ? record.requiredCapabilities.map(String) : ["TEXT"]
        ),
        costCredits: positiveInteger(record.costCredits ?? costRuleCredits(record.costRule), 1, 100000, 100),
        isEnabled: record.isEnabled !== false,
        sortOrder: positiveInteger(record.sortOrder, 0, 100000, index + 1),
        templateVersion: nullableString(record.templateVersion ?? record.pluginVersion, 40)
      } satisfies NormalizedToolTemplateImport;
    });
  }

  private async assertModelUsable(id: string | undefined) {
    const normalized = emptyToNull(id);

    if (!normalized) {
      return;
    }

    const model = await this.prisma.aiModel.findFirst({
      where: {
        id: normalized,
        isEnabled: true,
        provider: {
          isEnabled: true
        }
      },
      select: {
        id: true
      }
    });

    if (!model) {
      throw new AppException(40001, "选择的 AI 模型不存在或已停用", HttpStatus.BAD_REQUEST);
    }
  }

  private async assertAliasExists(aliasKey: string | undefined) {
    const normalized = emptyToNull(aliasKey);

    if (!normalized) {
      return;
    }

    const alias = await this.prisma.aiModelAlias.findUnique({
      where: {
        aliasKey: normalized
      },
      select: {
        aliasKey: true
      }
    });

    if (!alias) {
      throw new AppException(40001, "模型别名不存在，请先初始化 AI 模型预置。", HttpStatus.BAD_REQUEST);
    }
  }

  private async saveProviderTestResult(
    id: string,
    result: {
      success: boolean;
      message: string;
    },
    status: "ENABLED" | "TEST_FAILED"
  ) {
    await this.prisma.aiProviderInstance.update({
      where: {
        id
      },
      data: {
        status,
        lastTestedAt: new Date(),
        lastTestResult: result as Prisma.InputJsonValue
      }
    });
  }

  private async writeAiCallLog(
    taskId: string,
    activeModel: ActiveAiModel,
    input: {
      requestId?: string | null;
      usage?: TokenUsage | null;
      latencyMs?: number | null;
      success: boolean;
      errorCode?: string | null;
      errorMessage?: string | null;
    }
  ) {
    const usage = normalizedUsage(input.usage);

    await this.prisma.aiCallLog.create({
      data: {
        taskId,
        providerId: activeModel.providerId ?? null,
        modelId: activeModel.providerId ? activeModel.id : null,
        providerInstanceId: activeModel.providerInstanceId ?? null,
        modelInstanceId: activeModel.modelInstanceId ?? null,
        provider: activeModel.provider.name,
        model: activeModel.modelName,
        requestId: input.requestId ?? null,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
        latencyMs: input.latencyMs ?? null,
        success: input.success,
        errorCode: input.errorCode ?? null,
        errorMessage: input.errorMessage ?? null
      }
    });
  }

  private async writeMockCallLog(
    taskId: string,
    input: {
      latencyMs?: number | null;
      success: boolean;
      errorCode?: string | null;
      errorMessage?: string | null;
    }
  ) {
    await this.prisma.aiCallLog.create({
      data: {
        taskId,
        provider: "本地 mock",
        model: "mock-copywriting",
        latencyMs: input.latencyMs ?? null,
        success: input.success,
        errorCode: input.errorCode ?? null,
        errorMessage: input.errorMessage ?? null
      }
    });
  }

  private encryptApiKey(apiKey: string) {
    try {
      return encryptSecret(apiKey);
    } catch (error) {
      throw new AppException(
        50002,
        error instanceof Error ? error.message : "AI Provider 密钥加密失败",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private encryptedEnvApiKey(envName: string) {
    const apiKey = process.env[envName]?.trim();

    return apiKey ? this.encryptApiKey(apiKey) : null;
  }

  private resolveProviderTestApiKey(envName: string, encrypted: string | null) {
    if (encrypted) {
      try {
        decryptSecret(encrypted);
        return {
          apiKeyEncrypted: encrypted,
          message: null
        };
      } catch {
        const fallback = this.safeEncryptedEnvApiKey(envName);

        if (fallback.apiKeyEncrypted) {
          return fallback;
        }

        return {
          apiKeyEncrypted: null,
          message: fallback.message ?? "已保存的 API Key 无法解密，请重新填写 API Key 或确认 SECRET_ENCRYPTION_KEY"
        };
      }
    }

    return this.safeEncryptedEnvApiKey(envName);
  }

  private safeEncryptedEnvApiKey(envName: string) {
    const apiKey = process.env[envName]?.trim();

    if (!apiKey) {
      return {
        apiKeyEncrypted: null,
        message: `尚未配置 API Key，请在后台填写或配置环境变量 ${envName}`
      };
    }

    try {
      return {
        apiKeyEncrypted: this.encryptApiKey(apiKey),
        message: null
      };
    } catch (error) {
      return {
        apiKeyEncrypted: null,
        message: error instanceof Error ? error.message : "环境变量 API Key 加密失败"
      };
    }
  }

  private shouldSimulateFailure(input: string) {
    const normalized = input.toLowerCase();

    return normalized.includes("fail") || input.includes("触发失败");
  }

  private providerErrorMessage(error: unknown) {
    if (error instanceof AppException) {
      return error.message;
    }

    if (error instanceof ProviderAdapterException) {
      return error.message;
    }

    return "AI 生成失败，请稍后重试";
  }

  private async shouldSaveFullAiContent() {
    const config = await this.prisma.systemConfig
      .findUnique({
        where: {
          key: "aiSaveFullContent"
        },
        select: {
          value: true
        }
      })
      .catch(() => null);

    const value = config?.value.trim().toLowerCase();

    return value === "true" || value === "1" || value === "yes" || value === "enabled" || value === "启用";
  }

  private toScenario(scenario: AiScenarioRecord) {
    return {
      id: scenario.id,
      name: scenario.name,
      slug: scenario.slug,
      description: scenario.description,
      toolCategoryId: scenario.toolCategoryId,
      toolCategory: scenario.toolCategory ? this.toToolCategory(scenario.toolCategory) : null,
      promptTemplate: scenario.promptTemplate,
      promptVariables: this.promptVariables(scenario),
      inputSchema: this.normalizeInputSchema(scenario.inputSchema, false),
      requiredCapabilities: jsonStringArray(scenario.requiredCapabilities),
      costCredits: scenario.costCredits,
      isEnabled: scenario.isEnabled,
      defaultModelId: scenario.defaultModelId,
      fallbackModelId: scenario.fallbackModelId,
      defaultModelAlias: scenario.modelBinding?.defaultModelAlias ?? null,
      fallbackModelAlias: scenario.modelBinding?.fallbackModelAlias ?? null,
      sortOrder: scenario.sortOrder,
      isBuiltIn: scenario.isBuiltIn,
      templateVersion: scenario.templateVersion,
      createdAt: scenario.createdAt,
      updatedAt: scenario.updatedAt
    };
  }

  private toToolCategory(category: AiToolCategoryRecord) {
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      sortOrder: category.sortOrder,
      isVisible: category.isVisible,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    };
  }

  private toTask(task: AiTaskRecord) {
    return {
      id: task.id,
      userId: task.userId,
      user: task.user ?? null,
      scenarioId: task.scenarioId,
      knowledgeBaseId: task.knowledgeBaseId,
      aiProviderId: task.aiProviderId,
      aiModelId: task.aiModelId,
      status: task.status,
      statusName: this.taskStatusName(task.status),
      input: task.input,
      renderedPrompt: task.renderedPrompt,
      output: task.output,
      inputPreview: task.inputPreview,
      outputPreview: task.outputPreview,
      inputHash: task.inputHash,
      outputHash: task.outputHash,
      saveFullContent: task.saveFullContent,
      errorMessage: task.errorMessage,
      estimatedCredits: task.estimatedCredits,
      actualCredits: task.actualCredits,
      providerName: task.providerName,
      modelName: task.modelName,
      inputTokens: task.inputTokens,
      outputTokens: task.outputTokens,
      totalTokens: task.totalTokens,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      finishedAt: task.finishedAt,
      scenario: this.toScenario(task.scenario),
      reservation: task.reservation
        ? {
            id: task.reservation.id,
            amount: task.reservation.amount,
            status: task.reservation.status,
            statusName: this.reservationStatusName(task.reservation.status),
            expiresAt: task.reservation.expiresAt
          }
        : null,
      callLogs: task.callLogs?.map((log) => ({
        id: log.id,
        provider: log.provider,
        model: log.model,
        requestId: log.requestId,
        inputTokens: log.inputTokens,
        outputTokens: log.outputTokens,
        totalTokens: log.totalTokens,
        latencyMs: log.latencyMs,
        success: log.success,
        errorCode: log.errorCode,
        errorMessage: log.errorMessage,
        createdAt: log.createdAt
      })) ?? [],
      ledgerEntries: task.ledgerEntries?.map((entry) => ({
        id: entry.id,
        type: entry.type,
        typeName: this.ledgerTypeName(entry.type),
        amount: entry.amount,
        balanceAfter: entry.balanceAfter,
        relatedOrderId: entry.relatedOrderId,
        relatedTaskId: entry.relatedTaskId,
        note: entry.note,
        createdAt: entry.createdAt
      })) ?? []
    };
  }

  private toProvider(provider: {
    id: string;
    name: string;
    type: string;
    baseUrl: string;
    apiKeyPreview: string | null;
    isEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
    models: Array<{
      id: string;
      providerId: string;
      fallbackModelId: string | null;
      displayName: string;
      modelName: string;
      supportsStreaming: boolean;
      supportsVision: boolean;
      inputPrice: { toString(): string };
      outputPrice: { toString(): string };
      isEnabled: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>;
  }) {
    return {
      id: provider.id,
      name: provider.name,
      type: provider.type,
      baseUrl: provider.baseUrl,
      apiKeyPreview: provider.apiKeyPreview ?? "****",
      isEnabled: provider.isEnabled,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
      models: provider.models.map((model) => ({
        id: model.id,
        providerId: model.providerId,
        fallbackModelId: model.fallbackModelId,
        displayName: model.displayName,
        modelName: model.modelName,
        supportsStreaming: model.supportsStreaming,
        supportsVision: model.supportsVision,
        inputPrice: model.inputPrice.toString(),
        outputPrice: model.outputPrice.toString(),
        isEnabled: model.isEnabled,
        createdAt: model.createdAt,
        updatedAt: model.updatedAt
      }))
    };
  }

  private toProviderPreset(preset: {
    id: string;
    providerKey: string;
    displayName: string;
    adapterType: string;
    modality: string;
    defaultBaseUrl: string;
    defaultWebSocketUrl: string | null;
    apiKeyEnvName: string;
    docsUrl: string | null;
    region: string | null;
    isBuiltIn: boolean;
    isEnabledByDefault: boolean;
    presetVersion: string;
    lastUpdatedAt: Date;
    createdAt: Date;
    updatedAt: Date;
    modelPresets: Array<{
      id: string;
      providerPresetId: string;
      modelKey: string;
      displayName: string;
      providerModelName: string;
      capabilityTags: Prisma.JsonValue;
      contextWindow: number | null;
      supportsStreaming: boolean;
      supportsVision: boolean;
      supportsTools: boolean;
      supportsEmbedding: boolean;
      supportsImageGeneration: boolean;
      supportsAudio: boolean;
      isDeprecated: boolean;
      deprecatedMessage: string | null;
      replacementModelKey: string | null;
      recommendedAlias: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>;
    instances: Array<{
      id: string;
      providerPresetId: string;
      name: string;
      baseUrl: string;
      webSocketUrl: string | null;
      region: string | null;
      status: string;
      lastTestedAt: Date | null;
      lastTestResult: Prisma.JsonValue | null;
      createdAt: Date;
      updatedAt: Date;
      credential: {
        id: string;
        apiKeyEncrypted: string;
      } | null;
      modelInstances: Array<{
        id: string;
        providerInstanceId: string;
        modelPresetId: string | null;
        displayName: string;
        providerModelName: string;
        capabilityTags: Prisma.JsonValue;
        inputPrice: { toString(): string };
        outputPrice: { toString(): string };
        isEnabled: boolean;
        createdAt: Date;
        updatedAt: Date;
        modelPreset: {
          id: string;
          modelKey: string;
          recommendedAlias: string | null;
          isDeprecated: boolean;
          deprecatedMessage: string | null;
          replacementModelKey: string | null;
        } | null;
        aliases: Array<{
          aliasKey: string;
          displayName: string;
        }>;
      }>;
    }>;
  }) {
    return {
      id: preset.id,
      providerKey: preset.providerKey,
      displayName: preset.displayName,
      adapterType: preset.adapterType,
      modality: preset.modality,
      defaultBaseUrl: preset.defaultBaseUrl,
      defaultWebSocketUrl: preset.defaultWebSocketUrl,
      apiKeyEnvName: preset.apiKeyEnvName,
      docsUrl: preset.docsUrl,
      region: preset.region,
      isBuiltIn: preset.isBuiltIn,
      isEnabledByDefault: preset.isEnabledByDefault,
      presetVersion: preset.presetVersion,
      lastUpdatedAt: preset.lastUpdatedAt,
      createdAt: preset.createdAt,
      updatedAt: preset.updatedAt,
      modelPresets: preset.modelPresets.map((model) => ({
        ...model,
        capabilityTags: jsonStringArray(model.capabilityTags)
      })),
      instance: preset.instances[0] ? this.toProviderInstance(preset.instances[0]) : null
    };
  }

  private toProviderInstance(instance: {
    id: string;
    providerPresetId: string;
    name: string;
    baseUrl: string;
    webSocketUrl: string | null;
    region: string | null;
    status: string;
    lastTestedAt: Date | null;
    lastTestResult: Prisma.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
    credential: {
      id: string;
      apiKeyEncrypted: string;
    } | null;
    modelInstances: Array<{
      id: string;
      providerInstanceId: string;
      modelPresetId: string | null;
      displayName: string;
      providerModelName: string;
      capabilityTags: Prisma.JsonValue;
      inputPrice: { toString(): string };
      outputPrice: { toString(): string };
      isEnabled: boolean;
      createdAt: Date;
      updatedAt: Date;
      modelPreset?: {
        id: string;
        modelKey: string;
        recommendedAlias: string | null;
        isDeprecated: boolean;
        deprecatedMessage: string | null;
        replacementModelKey: string | null;
      } | null;
      aliases?: Array<{
        aliasKey: string;
        displayName: string;
      }>;
    }>;
  }) {
    return {
      id: instance.id,
      providerPresetId: instance.providerPresetId,
      name: instance.name,
      baseUrl: instance.baseUrl,
      webSocketUrl: instance.webSocketUrl,
      region: instance.region,
      status: instance.status,
      statusName: providerInstanceStatusName(instance.status),
      hasApiKey: Boolean(instance.credential),
      apiKeyPreview: instance.credential ? credentialPreview(instance.credential.apiKeyEncrypted) : "尚未配置 API Key",
      lastTestedAt: instance.lastTestedAt,
      lastTestResult: instance.lastTestResult,
      createdAt: instance.createdAt,
      updatedAt: instance.updatedAt,
      modelInstances: instance.modelInstances.map((model) => this.toModelInstance(model))
    };
  }

  private toModelInstance(model: {
    id: string;
    providerInstanceId: string;
    modelPresetId: string | null;
    displayName: string;
    providerModelName: string;
    capabilityTags: Prisma.JsonValue;
    inputPrice: { toString(): string };
    outputPrice: { toString(): string };
    isEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
    providerInstance?: {
      id: string;
      name: string;
      status: string;
      providerPreset: {
        displayName: string;
        providerKey: string;
      };
    };
    modelPreset?: {
      id: string;
      modelKey: string;
      recommendedAlias: string | null;
      isDeprecated: boolean;
      deprecatedMessage: string | null;
      replacementModelKey: string | null;
    } | null;
    aliases?: Array<{
      aliasKey: string;
      displayName: string;
    }>;
  }) {
    return {
      id: model.id,
      providerInstanceId: model.providerInstanceId,
      modelPresetId: model.modelPresetId,
      displayName: model.displayName,
      providerModelName: model.providerModelName,
      capabilityTags: jsonStringArray(model.capabilityTags),
      inputPrice: model.inputPrice.toString(),
      outputPrice: model.outputPrice.toString(),
      isEnabled: model.isEnabled,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      providerName: model.providerInstance?.name ?? null,
      providerPresetName: model.providerInstance?.providerPreset.displayName ?? null,
      modelPreset: model.modelPreset ?? null,
      aliases: model.aliases ?? []
    };
  }

  private toModelAlias(alias: {
    id: string;
    aliasKey: string;
    displayName: string;
    description: string | null;
    modelInstanceId: string | null;
    createdAt: Date;
    updatedAt: Date;
    modelInstance: {
      id: string;
      displayName: string;
      providerModelName: string;
      capabilityTags: Prisma.JsonValue;
      isEnabled: boolean;
      providerInstance: {
        id: string;
        name: string;
        status: string;
        providerPreset: {
          displayName: string;
          providerKey: string;
        };
      };
    } | null;
  }) {
    return {
      id: alias.id,
      aliasKey: alias.aliasKey,
      displayName: alias.displayName,
      description: alias.description,
      modelInstanceId: alias.modelInstanceId,
      statusName: alias.modelInstanceId ? "已配置" : "未配置",
      createdAt: alias.createdAt,
      updatedAt: alias.updatedAt,
      modelInstance: alias.modelInstance
        ? {
            id: alias.modelInstance.id,
            displayName: alias.modelInstance.displayName,
            providerModelName: alias.modelInstance.providerModelName,
            capabilityTags: jsonStringArray(alias.modelInstance.capabilityTags),
            isEnabled: alias.modelInstance.isEnabled,
            providerName: alias.modelInstance.providerInstance.name,
            providerPresetName: alias.modelInstance.providerInstance.providerPreset.displayName,
            providerStatus: alias.modelInstance.providerInstance.status
          }
        : null
    };
  }

  private toModel(model: {
    id: string;
    providerId: string;
    fallbackModelId: string | null;
    displayName: string;
    modelName: string;
    supportsStreaming: boolean;
    supportsVision: boolean;
    inputPrice: { toString(): string };
    outputPrice: { toString(): string };
    isEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: model.id,
      providerId: model.providerId,
      fallbackModelId: model.fallbackModelId,
      displayName: model.displayName,
      modelName: model.modelName,
      supportsStreaming: model.supportsStreaming,
      supportsVision: model.supportsVision,
      inputPrice: model.inputPrice.toString(),
      outputPrice: model.outputPrice.toString(),
      isEnabled: model.isEnabled,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt
    };
  }

  private taskStatusName(status: AiTaskStatus) {
    const names: Record<AiTaskStatus, string> = {
      CREATED: "已创建",
      RESERVED: "已冻结点数",
      RUNNING: "生成中",
      SUCCEEDED: "生成成功",
      FAILED: "生成失败",
      CANCELLED: "已取消",
      COMPENSATED: "已补偿"
    };

    return names[status];
  }

  private reservationStatusName(status: CreditReservationStatus) {
    const names: Record<CreditReservationStatus, string> = {
      RESERVED: "已冻结",
      SETTLED: "已结算",
      RELEASED: "已释放",
      EXPIRED: "已过期",
      FAILED: "冻结失败"
    };

    return names[status];
  }

  private ledgerTypeName(type: string) {
    const names: Record<string, string> = {
      TOP_UP: "充值入账",
      RESERVE: "点数冻结",
      CONSUME: "点数消耗",
      RELEASE: "释放冻结",
      REFUND: "退款退回",
      ADMIN_ADJUST: "管理员调整"
    };

    return names[type] ?? type;
  }
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function emptyToNull(value: string | undefined) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function jsonStringArray(value: Prisma.JsonValue | null | undefined) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function isAudioRecommendedAliasKey(value: string): value is (typeof audioRecommendedAliasKeys)[number] {
  return audioRecommendedAliasKeys.includes(value as (typeof audioRecommendedAliasKeys)[number]);
}

function audioRecommendedAliasCapability(aliasKey: (typeof audioRecommendedAliasKeys)[number]) {
  const capabilities: Record<(typeof audioRecommendedAliasKeys)[number], string | null> = {
    "tts-default": "TTS",
    "tts-fast": "TTS",
    "voice-clone-default": "VOICE_CLONE",
    "voice-design-default": "VOICE_DESIGN",
    "audio-preview": null
  };

  return capabilities[aliasKey];
}

function audioRecommendedAliasName(aliasKey: (typeof audioRecommendedAliasKeys)[number]) {
  const names: Record<(typeof audioRecommendedAliasKeys)[number], string> = {
    "tts-default": "默认语音合成模型",
    "tts-fast": "快速语音合成模型",
    "voice-clone-default": "默认声音复刻模型",
    "voice-design-default": "默认声音设计模型",
    "audio-preview": "音频预览模型"
  };

  return names[aliasKey];
}

function selectProviderTestModelName(
  adapterType: string,
  modelInstances: Array<{
    providerModelName: string;
    capabilityTags: Prisma.JsonValue;
  }>
) {
  if (adapterType !== "DASHSCOPE_AUDIO") {
    return modelInstances[0]?.providerModelName;
  }

  const systemVoicePriority = ["cosyvoice-v3-flash", "cosyvoice-v3-plus", "cosyvoice-v2", "cosyvoice-v1", "sambert"];
  for (const modelName of systemVoicePriority) {
    const matched = modelInstances.find((model) => model.providerModelName === modelName);
    if (matched) {
      return matched.providerModelName;
    }
  }

  return (
    modelInstances.find((model) => jsonStringArray(model.capabilityTags).includes("TTS"))?.providerModelName ??
    modelInstances[0]?.providerModelName
  );
}

function providerTestSucceeded(result: Prisma.JsonValue | null) {
  return Boolean(
    result &&
      typeof result === "object" &&
      !Array.isArray(result) &&
      (result as { success?: unknown }).success === true
  );
}

function normalizeCapabilityTags(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim().toUpperCase()).filter(Boolean))).slice(0, 12);
}

function promptVariablesFromInputSchema(schema: ToolInputSchema) {
  return schema.fields
    .filter((field) => field.name !== "input" && !isNonPromptToolField(field.type))
    .map((field) => ({
      name: field.name,
      label: field.label,
      required: field.required,
      placeholder: field.placeholder
    }));
}

function isToolInputFieldType(value: string): value is ToolInputFieldType {
  return (
    value === "text" ||
    value === "textarea" ||
    value === "select" ||
    value === "number" ||
    value === "switch" ||
    value === "voice-select" ||
    value === "audio-upload" ||
    value === "slider" ||
    value === "audio-preview" ||
    value === "format-select"
  );
}

function isNonPromptToolField(type: ToolInputFieldType) {
  return type === "voice-select" || type === "audio-upload" || type === "audio-preview";
}

function normalizeStringArray(value: unknown, limit: number) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item ?? "").trim()).filter(Boolean).slice(0, limit);
}

function normalizedDefaultValue(value: unknown, type: ToolInputFieldType) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (type === "number" || type === "slider") {
    const normalized = Number(value);

    return Number.isFinite(normalized) ? normalized : undefined;
  }

  if (type === "switch") {
    return isTruthySwitchValue(String(value));
  }

  return String(value).trim().slice(0, 200);
}

function optionalNumber(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const normalized = Number(value);

  return Number.isFinite(normalized) ? normalized : undefined;
}

function positiveInteger(value: unknown, min: number, max: number, fallback: number) {
  const normalized = Number(value);

  if (!Number.isFinite(normalized)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(normalized)));
}

function nullableString(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized ? normalized.slice(0, maxLength) : null;
}

function isTruthySwitchValue(value: string) {
  return ["1", "true", "on", "yes", "是", "启用"].includes(value.trim().toLowerCase());
}

function rawTemplateItems(payload: Record<string, unknown>) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.templates)) {
    return payload.templates;
  }

  if (payload.template && typeof payload.template === "object" && !Array.isArray(payload.template)) {
    return [payload.template];
  }

  if (
    typeof payload.name === "string" &&
    (typeof payload.slug === "string" || typeof payload.toolKey === "string")
  ) {
    return [payload];
  }

  return [];
}

function normalizeImportCategory(categoryInput: unknown, categorySlugInput: unknown) {
  if (categoryInput && typeof categoryInput === "object" && !Array.isArray(categoryInput)) {
    const record = categoryInput as Record<string, unknown>;
    const slug = String(record.slug ?? categorySlugInput ?? "").trim();
    const name = String(record.name ?? "").trim();

    assertValidSlug(slug);

    if (!name || name.length > 80) {
      throw new AppException(40001, "工具分类名称不能为空且不能超过 80 个字符", HttpStatus.BAD_REQUEST);
    }

    return {
      name,
      slug,
      description: nullableString(record.description, 240),
      sortOrder: positiveInteger(record.sortOrder, 0, 100000, 0),
      isVisible: record.isVisible !== false
    };
  }

  const slug = String(categorySlugInput ?? (typeof categoryInput === "string" ? categoryInput : "")).trim();
  assertValidSlug(slug);

  return {
    name: slug,
    slug,
    description: null,
    sortOrder: 0,
    isVisible: true
  };
}

function costRuleCredits(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const ruleType = String(record.type ?? "fixed").trim();

  if (ruleType && ruleType !== "fixed") {
    throw new AppException(40001, "当前仅支持 fixed 点数规则", HttpStatus.BAD_REQUEST);
  }

  return record.credits;
}

function assertToolTemplateHasNoSecrets(value: unknown) {
  const forbiddenKey = findToolTemplateSecretKey(value);

  if (forbiddenKey) {
    throw new AppException(40001, `工具模板不得包含密钥字段：${forbiddenKey}`, HttpStatus.BAD_REQUEST);
  }
}

function findToolTemplateSecretKey(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findToolTemplateSecretKey(item);

      if (found) {
        return found;
      }
    }

    return null;
  }

  for (const [key, child] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();

    if (
      normalizedKey.includes("apikey") ||
      normalizedKey.includes("api_key") ||
      normalizedKey.includes("secret") ||
      normalizedKey.includes("token")
    ) {
      return key;
    }

    const found = findToolTemplateSecretKey(child);

    if (found) {
      return found;
    }
  }

  return null;
}

function missingCapabilities(required: string[], available: string[]) {
  const normalizedAvailable = new Set(available.map((value) => value.toUpperCase()));

  return required.filter((capability) => !normalizedAvailable.has(capability.toUpperCase()));
}

function capabilityLabel(value: string) {
  const names: Record<string, string> = {
    TEXT: "文本生成",
    REASONING: "推理",
    VISION: "视觉理解",
    EMBEDDING: "向量检索",
    IMAGE_GENERATION: "图片生成",
    IMAGE_EDIT: "图片编辑",
    IMAGE_INPUT: "图片输入",
    REFERENCE_IMAGE: "参考图",
    BATCH_IMAGE: "批量出图",
    VIDEO_GENERATION: "视频生成",
    TEXT_TO_VIDEO: "文生视频",
    IMAGE_TO_VIDEO: "图生视频",
    REFERENCE_VIDEO: "参考视频",
    VIDEO_EDIT: "视频编辑",
    VIDEO_INPUT: "视频输入",
    REFERENCE_FILE: "参考文件",
    REFERENCE_AUDIO: "参考音频",
    AUDIO: "音频",
    TOOLS: "工具调用",
    STREAMING: "流式输出",
    LONG_CONTEXT: "长上下文",
    LOW_COST: "低成本",
    CHINA_FRIENDLY: "中国区友好",
    GLOBAL: "全球服务"
  };

  return names[value.toUpperCase()] ?? value;
}

function imageReferenceLimit(modelName: string, capabilityTags: string[]) {
  if (!capabilityTags.some((tag) => ["IMAGE_INPUT", "REFERENCE_IMAGE", "IMAGE_EDIT", "VISION", "MULTIMODAL"].includes(tag))) {
    return 0;
  }

  if (modelName.startsWith("wan2.7-image")) {
    return 9;
  }

  return modelName.startsWith("qwen-image-") ? 3 : 4;
}

function imageOutputLimit(capabilityTags: string[], modelName?: string) {
  if (modelName === "z-image-turbo") {
    return 1;
  }

  if (modelName?.startsWith("wan2.7-image")) {
    return 4;
  }

  return capabilityTags.includes("BATCH_IMAGE") ? 6 : 1;
}

function imageGenerationModelPriority(modelName: string) {
  if (modelName === "wan2.7-image-pro") {
    return 0;
  }

  if (modelName === "wan2.7-image") {
    return 1;
  }

  if (modelName === "qwen-image-2.0-pro") {
    return 2;
  }

  if (modelName === "qwen-image-2.0") {
    return 3;
  }

  if (modelName === "z-image-turbo") {
    return 4;
  }

  return 10;
}

function isDashScopeImageGenerationModel(modelName: string) {
  return modelName.startsWith("qwen-image-") || modelName.startsWith("wan2.7-image") || modelName === "z-image-turbo";
}

function normalizeImageReferences(value: unknown, maxReferenceImages: number) {
  if (maxReferenceImages <= 0) {
    return [];
  }

  return normalizeProviderAttachments(value)
    .filter((attachment) => {
      return attachment.type === "image" && attachment.mimeType.startsWith("image/") && Boolean(attachment.dataUrl?.startsWith("data:image/"));
    })
    .slice(0, maxReferenceImages);
}

function dashScopeImageEndpoint(baseUrl: string) {
  try {
    const url = new URL(baseUrl);

    return `${url.origin}/api/v1/services/aigc/multimodal-generation/generation`;
  } catch {
    return "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";
  }
}

function extractDashScopeImageUrls(payload: DashScopeImageResponse) {
  const urls: string[] = [];
  collectImageUrls(payload.output, urls);

  return Array.from(new Set(urls)).slice(0, 6);
}

function collectImageUrls(value: unknown, urls: string[]) {
  if (!value) {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectImageUrls(item, urls);
    }
    return;
  }

  if (typeof value !== "object") {
    return;
  }

  const record = value as Record<string, unknown>;
  for (const key of ["image", "image_url", "url", "orig_url"]) {
    const url = record[key];
    if (typeof url === "string" && /^https?:\/\//.test(url)) {
      urls.push(url);
    }
  }

  for (const child of Object.values(record)) {
    collectImageUrls(child, urls);
  }
}

function dashScopeImageErrorMessage(payload: DashScopeImageResponse | null, status: number) {
  const message = stringValue(payload?.message);

  if (message) {
    return `图片生成失败：${message}`;
  }

  if (status === 401 || status === 403) {
    return "图片生成失败：DASHSCOPE_API_KEY 无效或权限不足。";
  }

  if (status === 404) {
    return "图片生成失败：模型名称或接口地址不正确。";
  }

  if (status === 429) {
    return "图片生成失败：接口限流或额度不足，请稍后重试。";
  }

  return "图片生成接口返回异常，请稍后重试。";
}

function videoReferenceLimit(modelName: string, capabilityTags: string[]) {
  if (!capabilityTags.includes("VIDEO_GENERATION")) {
    return 0;
  }

  if (modelName.includes("-t2v")) {
    return capabilityTags.includes("REFERENCE_AUDIO") ? 1 : 0;
  }

  if (modelName.includes("-i2v")) {
    return modelName.startsWith("wan2.7-") ? 3 : 1;
  }

  if (modelName.includes("-r2v")) {
    return modelName.startsWith("happyhorse-") ? 9 : 6;
  }

  if (modelName.endsWith("videoedit") || modelName.endsWith("video-edit")) {
    return 6;
  }

  return capabilityTags.some((tag) => ["REFERENCE_FILE", "REFERENCE_IMAGE", "REFERENCE_VIDEO", "VIDEO_INPUT"].includes(tag)) ? 4 : 0;
}

function videoReferenceAccept(modelName: string, capabilityTags: string[]) {
  const accepts = new Set<string>();

  if (capabilityTags.includes("IMAGE_INPUT") || capabilityTags.includes("REFERENCE_IMAGE")) {
    accepts.add("image/*");
  }

  if (capabilityTags.includes("VIDEO_INPUT") || capabilityTags.includes("REFERENCE_VIDEO") || modelName.endsWith("videoedit") || modelName.endsWith("video-edit")) {
    accepts.add("video/*");
  }

  if (capabilityTags.includes("REFERENCE_AUDIO")) {
    accepts.add("audio/*");
  }

  return Array.from(accepts);
}

function videoDefaultDuration(modelName: string) {
  if (modelName.startsWith("happyhorse-")) {
    return 5;
  }

  return 5;
}

function videoGenerationModelPriority(modelName: string) {
  if (modelName === "wan2.7-t2v") {
    return 0;
  }

  if (modelName === "wan2.7-t2v-2026-04-25") {
    return 1;
  }

  if (modelName === "wan2.7-i2v") {
    return 2;
  }

  if (modelName === "wan2.7-i2v-2026-04-25") {
    return 3;
  }

  if (modelName === "wan2.7-r2v") {
    return 4;
  }

  if (modelName === "wan2.7-videoedit") {
    return 5;
  }

  if (modelName === "happyhorse-1.0-t2v") {
    return 6;
  }

  if (modelName === "happyhorse-1.0-i2v") {
    return 7;
  }

  if (modelName === "happyhorse-1.0-r2v") {
    return 8;
  }

  if (modelName === "happyhorse-1.0-video-edit") {
    return 9;
  }

  return 20;
}

function isDashScopeVideoGenerationModel(modelName: string) {
  return modelName.startsWith("wan2.7-") || modelName.startsWith("happyhorse-1.0-");
}

function normalizeVideoReferences(value: unknown, maxReferenceFiles: number, modelName: string, capabilityTags: string[]) {
  if (maxReferenceFiles <= 0) {
    return [];
  }

  const accepts = videoReferenceAccept(modelName, capabilityTags);
  const normalized = normalizeProviderAttachments(value)
    .filter((attachment) => {
      if (attachment.type === "image") {
        return accepts.includes("image/*") && attachment.mimeType.startsWith("image/") && Boolean(attachment.dataUrl?.startsWith("data:image/"));
      }

      if (attachment.type === "video") {
        return accepts.includes("video/*") && attachment.mimeType.startsWith("video/") && Boolean(attachment.dataUrl?.startsWith("data:video/"));
      }

      if (attachment.type === "audio") {
        return accepts.includes("audio/*") && attachment.mimeType.startsWith("audio/") && Boolean(attachment.dataUrl?.startsWith("data:audio/"));
      }

      return false;
    })
    .slice(0, maxReferenceFiles);

  assertVideoReferences(modelName, normalized);

  return normalized;
}

function assertVideoReferences(modelName: string, references: ProviderTextAttachment[]) {
  if (modelName.includes("-t2v")) {
    return;
  }

  if (modelName.includes("-i2v") && !references.some((item) => item.type === "image")) {
    throw new AppException(40001, "当前图生视频模型需要至少上传 1 张参考图片。", HttpStatus.BAD_REQUEST);
  }

  if (modelName.includes("-r2v") && !references.some((item) => item.type === "image" || item.type === "video")) {
    throw new AppException(40001, "当前参考生视频模型需要至少上传 1 个参考图片或视频。", HttpStatus.BAD_REQUEST);
  }

  if ((modelName.endsWith("videoedit") || modelName.endsWith("video-edit")) && !references.some((item) => item.type === "video")) {
    throw new AppException(40001, "当前视频编辑模型需要至少上传 1 个参考视频。", HttpStatus.BAD_REQUEST);
  }
}

function normalizedVideoRatio(value: string | undefined) {
  const normalized = value?.trim();

  return normalized && ["16:9", "9:16", "1:1", "4:3", "3:4"].includes(normalized) ? normalized : "16:9";
}

function normalizedVideoResolution(value: string | undefined) {
  const normalized = value?.trim();

  return normalized && ["高清 720P", "高清 1080P"].includes(normalized) ? normalized : "高清 720P";
}

function videoSizeFromRatio(ratio: string, resolution: string) {
  const longEdge = resolution.includes("1080") ? 1080 : 720;
  const sizes: Record<string, [number, number]> = {
    "16:9": [longEdge === 1080 ? 1920 : 1280, longEdge],
    "9:16": [longEdge, longEdge === 1080 ? 1920 : 1280],
    "1:1": [longEdge, longEdge],
    "4:3": [longEdge === 1080 ? 1440 : 960, longEdge],
    "3:4": [longEdge, longEdge === 1080 ? 1440 : 960]
  };
  const [width, height] = sizes[ratio] ?? sizes["16:9"];

  return `${width}*${height}`;
}

function dashScopeVideoInput(modelName: string, prompt: string, references: ProviderTextAttachment[]) {
  const images = references.filter((item) => item.type === "image" && item.dataUrl);
  const videos = references.filter((item) => item.type === "video" && item.dataUrl);
  const audios = references.filter((item) => item.type === "audio" && item.dataUrl);
  const media: Array<{ type: string; video_url?: string; image_url?: string; audio_url?: string }> = [];

  if (modelName.includes("-i2v")) {
    if (images[0]?.dataUrl) {
      media.push({ type: "first_frame", image_url: images[0].dataUrl });
    }
    if (images[1]?.dataUrl) {
      media.push({ type: "last_frame", image_url: images[1].dataUrl });
    }
    if (videos[0]?.dataUrl) {
      media.push({ type: "reference_video", video_url: videos[0].dataUrl });
    }
    if (audios[0]?.dataUrl) {
      media.push({ type: "driving_audio", audio_url: audios[0].dataUrl });
    }
  } else if (modelName.includes("-r2v")) {
    for (const image of images.slice(0, 9)) {
      media.push({ type: "reference_image", image_url: image.dataUrl });
    }
    for (const video of videos.slice(0, 3)) {
      media.push({ type: "reference_video", video_url: video.dataUrl });
    }
    if (audios[0]?.dataUrl) {
      media.push({ type: "reference_audio", audio_url: audios[0].dataUrl });
    }
  } else if (modelName.endsWith("videoedit") || modelName.endsWith("video-edit")) {
    if (videos[0]?.dataUrl) {
      media.push({ type: "video", video_url: videos[0].dataUrl });
    }
    for (const image of images.slice(0, 5)) {
      media.push({ type: "reference_image", image_url: image.dataUrl });
    }
  } else if (audios[0]?.dataUrl) {
    media.push({ type: "audio", audio_url: audios[0].dataUrl });
  }

  return media.length > 0 ? { prompt, media } : { prompt };
}

function dashScopeVideoEndpoint(baseUrl: string) {
  try {
    const url = new URL(baseUrl);

    return `${url.origin}/api/v1/services/aigc/video-generation/video-synthesis`;
  } catch {
    return "https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis";
  }
}

function dashScopeTaskEndpoint(baseUrl: string, taskId: string) {
  try {
    const url = new URL(baseUrl);

    return `${url.origin}/api/v1/tasks/${encodeURIComponent(taskId)}`;
  } catch {
    return `https://dashscope.aliyuncs.com/api/v1/tasks/${encodeURIComponent(taskId)}`;
  }
}

function dashScopeTaskId(payload: DashScopeVideoResponse) {
  const taskId = findStringByKeys(payload.output, ["task_id", "taskId"]);

  return taskId ?? findStringByKeys(payload, ["task_id", "taskId"]);
}

function dashScopeVideoStatus(payload: DashScopeVideoResponse) {
  const status = findStringByKeys(payload.output, ["task_status", "taskStatus", "status"]) ?? findStringByKeys(payload, ["task_status", "taskStatus", "status"]);
  const normalized = status?.toUpperCase();

  if (normalized === "SUCCEEDED" || normalized === "SUCCESS") {
    return "SUCCEEDED";
  }

  if (normalized === "FAILED" || normalized === "FAIL") {
    return "FAILED";
  }

  if (normalized === "CANCELED" || normalized === "CANCELLED") {
    return "CANCELLED";
  }

  return "RUNNING";
}

function videoTaskStatusName(status: string) {
  const names: Record<string, string> = {
    RUNNING: "生成中",
    SUCCEEDED: "生成完成",
    FAILED: "生成失败",
    CANCELLED: "已取消"
  };

  return names[status] ?? status;
}

function dashScopeVideoTaskError(payload: DashScopeVideoResponse) {
  return (
    findStringByKeys(payload.output, ["message", "error_message", "errorMessage"]) ??
    stringValue(payload.message) ??
    null
  );
}

function extractDashScopeVideoUrls(payload: DashScopeVideoResponse) {
  const urls: string[] = [];
  collectVideoUrls(payload.output, urls);

  return Array.from(new Set(urls));
}

function collectVideoUrls(value: unknown, urls: string[]) {
  if (!value) {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectVideoUrls(item, urls);
    }
    return;
  }

  if (typeof value !== "object") {
    return;
  }

  const record = value as Record<string, unknown>;
  for (const key of ["video_url", "video", "url", "output_url"]) {
    const url = record[key];
    if (typeof url === "string" && /^https?:\/\//.test(url)) {
      urls.push(url);
    }
  }

  for (const child of Object.values(record)) {
    collectVideoUrls(child, urls);
  }
}

function findStringByKeys(value: unknown, keys: string[]): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findStringByKeys(item, keys);
      if (found) {
        return found;
      }
    }
    return null;
  }

  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const found = stringValue(record[key]);
    if (found) {
      return found;
    }
  }

  for (const child of Object.values(record)) {
    const found = findStringByKeys(child, keys);
    if (found) {
      return found;
    }
  }

  return null;
}

function dashScopeVideoErrorMessage(payload: DashScopeVideoResponse | null, status: number) {
  const message = stringValue(payload?.message);

  if (message) {
    return `视频生成失败：${message}`;
  }

  if (status === 401 || status === 403) {
    return "视频生成失败：DASHSCOPE_API_KEY 无效或权限不足。";
  }

  if (status === 404) {
    return "视频生成失败：模型名称或接口地址不正确。";
  }

  if (status === 429) {
    return "视频生成失败：接口限流或额度不足，请稍后重试。";
  }

  return "视频生成接口返回异常，请稍后重试。";
}

function aiVideoTimeoutMs() {
  const value = Number(process.env.AI_VIDEO_TIMEOUT_MS ?? "30000");

  return Number.isFinite(value) && value > 0 ? value : 30000;
}

function aiVideoTaskTimeoutMs() {
  const value = Number(process.env.AI_VIDEO_TASK_TIMEOUT_MS ?? "15000");

  return Number.isFinite(value) && value > 0 ? value : 15000;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function providerInstanceStatusName(status: string) {
  const names: Record<string, string> = {
    DISABLED: "未启用",
    ENABLED: "已启用",
    TEST_FAILED: "测试失败"
  };

  return names[status] ?? status;
}

function credentialPreview(encrypted: string) {
  try {
    return maskSecret(decryptSecret(encrypted));
  } catch {
    return "已配置";
  }
}

function normalizedUsage(usage?: TokenUsage | null) {
  const inputTokens = integerValue(usage?.inputTokens);
  const outputTokens = integerValue(usage?.outputTokens);
  const totalTokens = integerValue(usage?.totalTokens) || inputTokens + outputTokens || null;

  return {
    inputTokens: inputTokens || null,
    outputTokens: outputTokens || null,
    totalTokens
  };
}

function normalizeProviderAttachments(value: unknown): ProviderTextAttachment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const name = normalizedShortString(record.name, 200);
      const type = normalizedShortString(record.type, 30);
      const mimeType = normalizedShortString(record.mimeType, 120);
      const size = integerValue(record.size);
      const dataUrl = normalizedShortString(record.dataUrl, 15 * 1024 * 1024);

      if (!name || !type || !mimeType) {
        return null;
      }

      return {
        name,
        type,
        mimeType,
        size,
        ...(dataUrl ? { dataUrl } : {})
      };
    })
    .filter((item): item is ProviderTextAttachment => Boolean(item))
    .slice(0, 6);
}

function attachmentsForModel(model: ActiveAiModel | null, attachments: ProviderTextAttachment[]) {
  if (!model || attachments.length === 0 || !modelSupportsVision(model)) {
    return [];
  }

  return attachments;
}

function modelSupportsVision(model: ActiveAiModel) {
  return modelHasAnyCapability(model, ["VISION", "MULTIMODAL", "IMAGE", "IMAGE_INPUT"]);
}

function modelHasCapability(model: ActiveAiModel, capability: string) {
  return modelHasAnyCapability(model, [capability]);
}

function modelHasAnyCapability(model: ActiveAiModel, capabilities: string[]) {
  const tags = new Set((model.capabilityTags ?? []).map((tag) => tag.toUpperCase()));

  return capabilities.some((tag) => tags.has(tag.toUpperCase()));
}

function estimateMockTokenUsage(input: string, output: string): TokenUsage {
  const inputTokens = estimateTokenCount(input);
  const outputTokens = estimateTokenCount(output);

  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens
  };
}

function estimateTokenCount(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return 0;
  }

  return Math.max(1, Math.ceil(normalized.length / 2));
}

function integerValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

function normalizedShortString(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function contentPreview(value: string | null | undefined, maxLength: number) {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    return "";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}...`;
}

function contentHash(value: string | null | undefined) {
  return createHash("sha256").update(String(value ?? "")).digest("hex");
}

function extractTemplateVariables(template: string) {
  const names = new Set<string>();
  const doubleBracePattern = /{{\s*([a-zA-Z][a-zA-Z0-9_]{0,39})\s*}}/g;
  const singleBracePattern = /\{([a-zA-Z][a-zA-Z0-9_]{0,39})\}/g;
  let match: RegExpExecArray | null;

  while ((match = doubleBracePattern.exec(template))) {
    names.add(match[1]);
  }

  while ((match = singleBracePattern.exec(template))) {
    const name = match[1];

    if (isSingleBraceTemplateVariable(template, match.index, match[0].length, name)) {
      names.add(name);
    }
  }

  return Array.from(names);
}

function renderPromptTemplate(template: string, variables: Record<string, string>) {
  return template
    .replace(/{{\s*([a-zA-Z][a-zA-Z0-9_]{0,39})\s*}}/g, (_match, name: string) => variables[name] ?? "")
    .replace(/\{([a-zA-Z][a-zA-Z0-9_]{0,39})\}/g, (match: string, name: string, offset: number, source: string) => {
      if (!isSingleBraceTemplateVariable(source, offset, match.length, name)) {
        return match;
      }

      return Object.prototype.hasOwnProperty.call(variables, name) ? variables[name] ?? "" : match;
    });
}

function isSingleBraceTemplateVariable(template: string, openBraceIndex: number, matchLength: number, name: string) {
  const closeBraceIndex = openBraceIndex + matchLength - 1;
  const beforeChar = template[openBraceIndex - 1] ?? "";
  const afterChar = template[closeBraceIndex + 1] ?? "";

  if (beforeChar === "{" || afterChar === "}") {
    return false;
  }

  const previousNonWhitespace = previousNonWhitespaceChar(template, openBraceIndex);

  if (previousNonWhitespace && /[A-Za-z\\}]/.test(previousNonWhitespace)) {
    return false;
  }

  if (name.length === 1 && previousNonWhitespace !== ":" && previousNonWhitespace !== "：" && previousNonWhitespace !== "") {
    return false;
  }

  return true;
}

function previousNonWhitespaceChar(value: string, beforeIndex: number) {
  for (let index = beforeIndex - 1; index >= 0; index -= 1) {
    const char = value[index];

    if (!/\s/.test(char)) {
      return char;
    }
  }

  return "";
}

function keywordTokens(value: string) {
  const ascii = value
    .toLowerCase()
    .split(/[^a-z0-9\u4e00-\u9fa5]+/u)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);
  const chineseChars = Array.from(value.matchAll(/[\u4e00-\u9fa5]/gu)).map((match) => match[0]);

  return Array.from(new Set([...ascii, ...chineseChars])).slice(0, 60);
}

function scoreText(value: string, words: string[]) {
  if (words.length === 0) {
    return 0;
  }

  const normalized = value.toLowerCase();

  return words.reduce((score, word) => score + (normalized.includes(word.toLowerCase()) ? 1 : 0), 0);
}

function aiGatewayTimeoutMs() {
  const value = Number(process.env.AI_GATEWAY_TIMEOUT_MS ?? 120_000);

  return Number.isFinite(value) && value > 0 ? value : 120_000;
}

function aiImageTimeoutMs() {
  const value = Number(process.env.AI_IMAGE_TIMEOUT_MS ?? 180_000);

  return Number.isFinite(value) && value > 0 ? value : 180_000;
}

function aiTemperature() {
  const value = Number(process.env.AI_PROVIDER_TEMPERATURE ?? 0.7);

  return Number.isFinite(value) ? value : 0.7;
}

function aiMaxTokens() {
  const fallbackMaxTokens = 2048;
  const value = Number(process.env.AI_PROVIDER_MAX_TOKENS ?? fallbackMaxTokens);

  return Number.isFinite(value) && value > 0 ? Math.round(value) : fallbackMaxTokens;
}
