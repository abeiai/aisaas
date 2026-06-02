import { createHash, createHmac, randomBytes } from "node:crypto";
import { createReadStream, existsSync, mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import { HttpStatus, Injectable } from "@nestjs/common";
import { decryptSecret, encryptSecret, getPrismaClient, hashPassword, maskSecret, type Prisma } from "@aisaas/database";
import { AppException } from "../common/app-exception.js";
import { OrganizationsService } from "../organizations/organizations.service.js";
import {
  type AiModelPricingMode,
  type AiModelPricingUnit,
  normalizeModelPricingConfig,
  normalizePricingMode,
  normalizePricingUnit,
  pricingConfigToJson,
  pricingSummaryFromConfig
} from "../ai/model-pricing.js";
import { getClientIp, getUserAgent, type HeaderRequestLike } from "../security/request-types.js";
import { cosyVoiceSystemVoices } from "./cosyvoice-system-voices.js";
import {
  CreateAudioAssetDto,
  CreatePlatformVoiceAssetDto,
  DeleteVoiceAssetAdminDto,
  CreateTtsAudioTaskDto,
  CreateVoiceCloneTaskDto,
  CreateVoiceDesignTaskDto,
  ReviewVoiceAssetDto,
  SetDefaultVoiceDto,
  UpdateAudioModelDto,
  UpdateSystemVoiceDto,
  UpdateVoiceAssetDto
} from "./dto/audio.dto.js";

type AudioTaskStatus =
  | "CREATED"
  | "RESERVED"
  | "UPLOADING"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "COMPENSATED";

type AudioTaskType = "TTS" | "VOICE_CLONE" | "VOICE_DESIGN";
interface AdminAudioTaskListFilters {
  user?: string;
  status?: string;
  type?: string;
  provider?: string;
  model?: string;
  startTime?: string;
  endTime?: string;
  page?: string;
  pageSize?: string;
}
type AudioBillingMode = "PER_CHARACTER" | "PER_TASK" | "PER_SECOND";
type CreditReservationStatus = "RESERVED" | "SETTLED" | "RELEASED" | "EXPIRED" | "FAILED";
type VoiceConsentType = "SELF_VOICE" | "AUTHORIZED_VOICE";
type VoiceAssetModerationAction = "APPROVE" | "REJECT" | "DISABLE";
type BillingContext = "PERSONAL" | "ORGANIZATION";

interface BillingContextOptions {
  billingContext: BillingContext;
  organizationId?: string;
}

interface ActiveAudioModel {
  modelInstanceId: string;
  providerInstanceId: string;
  providerKey: string;
  providerName: string;
  providerDisplayName: string;
  adapterType: string;
  modelName: string;
  baseUrl: string;
  webSocketUrl: string | null;
  region: string | null;
  apiKeyEncrypted: string | null;
  apiKeyEnvName: string;
  capabilityTags: string[];
  inputPrice: number;
  outputPrice: number;
  pricingMode: AiModelPricingMode;
  pricingUnit: AiModelPricingUnit;
  pricingConfig: Prisma.JsonValue | null;
}

interface AudioTaskRecord {
  id: string;
  userId: string;
  billingContext: BillingContext;
  organizationId: string | null;
  organizationMemberId: string | null;
  type: AudioTaskType;
  status: AudioTaskStatus;
  provider: string;
  model: string;
  providerInstanceId: string | null;
  modelInstanceId: string | null;
  voiceAssetId: string | null;
  inputText: string | null;
  inputTextLength: number;
  sourceAudioAssetId: string | null;
  outputAudioAssetId: string | null;
  estimatedCredits: number;
  actualCredits: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  requestId: string | null;
  providerPayload: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
  finishedAt: Date | null;
  user?: {
    id: string;
    email: string;
    nickname: string;
  };
  voiceAsset?: {
    id: string;
    name: string;
    providerVoiceId: string | null;
    targetModel: string;
    status: string;
    visibility: string;
    consent?: VoiceConsentRecord | null;
  } | null;
  sourceAudioAsset?: AudioAssetRecord | null;
  outputAudioAsset?: AudioAssetRecord | null;
  reservation?: {
    id: string;
    amount: number;
    status: CreditReservationStatus;
    expiresAt: Date;
  } | null;
  ledgerEntries?: Array<{
    id: string;
    type: string;
    amount: number;
    balanceAfter: number;
    relatedTaskId: string | null;
    relatedAudioTaskId: string | null;
    relatedTaskType: string | null;
    operationType: AudioTaskType | null;
    note: string | null;
    createdAt: Date;
  }>;
  usageLogs?: Array<{
    id: string;
    taskId: string;
    userId: string;
    provider: string;
    model: string;
    providerInstanceId: string | null;
    modelInstanceId: string | null;
    voiceAssetId: string | null;
    operationType: AudioTaskType;
    characterCount: number;
    audioDurationMs: number | null;
    usageCount: number;
    latencyMs: number | null;
    success: boolean;
    estimatedCost: DecimalLike;
    consumedCredits: number;
    providerRequestId: string | null;
    createdAt: Date;
  }>;
}

interface AudioPricingQuote {
  ruleId: string;
  pricingSource: "RULE" | "MODEL";
  billingMode: AudioBillingMode;
  creditsPerUnit: number;
  minimumCredits: number;
  modelMultiplier: number;
  pricingMode?: AiModelPricingMode;
  pricingUnit?: AiModelPricingUnit;
  pricePerUnit?: number;
  unitSize?: number;
  creditsPerCny?: number;
  estimatedCost?: number;
  usageCount: number;
  estimatedCredits: number;
}

type DecimalLike = { toString(): string } | string | number;
type ActiveAudioModelRecord = Prisma.AiModelInstanceGetPayload<{ include: ReturnType<typeof activeAudioModelInclude> }>;
type AdminAudioModelRecord = Prisma.AiModelInstanceGetPayload<{ include: ReturnType<typeof adminAudioModelInclude> }>;
type AdminVoiceAssetRecord = Prisma.VoiceAssetGetPayload<{ include: ReturnType<typeof adminVoiceAssetInclude> }>;
type SystemVoiceStatus = "READY" | "DISABLED";

interface SystemVoiceOverride {
  name?: string;
  description?: string;
  trait?: string;
  scene?: string;
  ageCategory?: "儿童" | "青年" | "中年" | "老年";
  status?: SystemVoiceStatus;
  disabledReason?: string | null;
  updatedAt?: string;
}

interface AdminSystemVoiceFilters {
  keyword?: string;
  status?: string;
  language?: string;
  model?: string;
}

interface VoiceConsentRecord {
  id: string;
  userId: string;
  voiceAssetId: string | null;
  sourceAudioAssetId: string | null;
  statement: string;
  consentText: string;
  consentType: VoiceConsentType;
  ownerName: string | null;
  ownerContact: string | null;
  agreedAt: Date;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
}

interface AudioAssetRecord {
  id: string;
  userId: string;
  type: string;
  storageProvider: string;
  url: string;
  objectKey: string;
  mimeType: string;
  durationMs: number | null;
  sizeBytes: number;
  sampleRate: number | null;
  channels: number | null;
  createdAt: Date;
}

export interface UploadedAudioFileLike {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const allowedAudioMimeTypes = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/aac",
  "video/mp4"
]);

const systemVoices = cosyVoiceSystemVoices;
const systemVoiceOverrideConfigKey = "cosyVoiceSystemVoiceOverrides";

const audioModelAliases = [
  "tts-default",
  "tts-fast",
  "voice-clone-default",
  "voice-design-default",
  "audio-preview"
] as const;
const dashscopeAudioProviderKey = "aliyun_dashscope_audio";

@Injectable()
export class AudioService {
  private readonly prisma = getPrismaClient();

  constructor(private readonly organizationsService?: OrganizationsService) {}

  private async ensureDashScopeAudioDefaults() {
    const preset = await this.prisma.aiProviderPreset.findUnique({
      where: {
        providerKey: dashscopeAudioProviderKey
      },
      include: {
        instances: {
          take: 1,
          orderBy: {
            createdAt: "asc"
          }
        },
        modelPresets: {
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    });

    if (!preset) {
      return;
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
    const existingModelCount = await this.prisma.aiModelInstance.count({
      where: {
        providerInstanceId: instance.id
      }
    });

    await this.normalizeDefaultAudioModelPricing(instance.id, preset.modelPresets);

    if (existingModelCount > 0) {
      return;
    }

    for (const modelPreset of preset.modelPresets) {
      const recommendedAlias = emptyToNull(modelPreset.recommendedAlias ?? undefined);
      if (!recommendedAlias || !isAudioModelAliasKey(recommendedAlias)) {
        continue;
      }

      const capabilityTags = jsonStringArray(modelPreset.capabilityTags);
      const model = await this.prisma.aiModelInstance.upsert({
        where: {
          providerInstanceId_providerModelName: {
            providerInstanceId: instance.id,
            providerModelName: modelPreset.providerModelName
          }
        },
        update: {
          displayName: modelPreset.displayName,
          capabilityTags: capabilityTags as Prisma.InputJsonValue,
          modelPresetId: modelPreset.id
        },
        create: {
          providerInstanceId: instance.id,
          modelPresetId: modelPreset.id,
          displayName: modelPreset.displayName,
          providerModelName: modelPreset.providerModelName,
          baseUrl: instance.baseUrl,
          webSocketUrl: instance.webSocketUrl,
          region: instance.region,
          capabilityTags: capabilityTags as Prisma.InputJsonValue,
          inputPrice: capabilityTags.includes("TTS") ? "1" : "0",
          outputPrice: "0",
          pricingMode: "CHARACTERS",
          pricingUnit: "TEN_K_CHARACTERS",
          isEnabled: true
        }
      });

      if (model.isEnabled) {
        await this.bindRecommendedAudioAlias(recommendedAlias, model.id);
      }
    }
  }

  private async normalizeDefaultAudioModelPricing(
    providerInstanceId: string,
    modelPresets: Array<{
      providerModelName: string;
      capabilityTags: Prisma.JsonValue | null;
    }>
  ) {
    const ttsModelNames = modelPresets
      .filter((modelPreset) => jsonStringArray(modelPreset.capabilityTags).includes("TTS"))
      .map((modelPreset) => modelPreset.providerModelName);

    if (ttsModelNames.length === 0) {
      return;
    }

    const staleModels = await this.prisma.aiModelInstance.findMany({
      where: {
        providerInstanceId,
        providerModelName: {
          in: ttsModelNames
        },
        inputPrice: 0
      }
    });

    await Promise.all(
      staleModels
        .filter((model) => Math.abs(model.updatedAt.getTime() - model.createdAt.getTime()) < 1000)
        .map((model) =>
          this.prisma.aiModelInstance.update({
            where: {
              id: model.id
            },
            data: {
              inputPrice: "1",
              outputPrice: "0",
              pricingMode: "CHARACTERS",
              pricingUnit: "TEN_K_CHARACTERS"
            }
          })
        )
    );
  }

  private async bindRecommendedAudioAlias(aliasKey: (typeof audioModelAliases)[number], modelInstanceId: string) {
    const alias = await this.prisma.aiModelAlias.findUnique({
      where: {
        aliasKey
      },
      include: {
        modelInstance: {
          include: activeAudioModelInclude()
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
        displayName: alias?.displayName ?? audioAliasName(aliasKey),
        description: alias?.description ?? null,
        modelInstanceId
      },
      create: {
        aliasKey,
        displayName: audioAliasName(aliasKey),
        modelInstanceId
      }
    });
  }

  private async systemVoiceModelHealth(supportedModels: readonly string[]) {
    await this.ensureDashScopeAudioDefaults();

    const models = await this.prisma.aiModelInstance.findMany({
      where: {
        providerModelName: {
          in: [...supportedModels]
        },
        providerInstance: {
          providerPreset: {
            adapterType: "DASHSCOPE_AUDIO",
            modality: "AUDIO"
          }
        }
      },
      include: {
        aliases: true,
        providerInstance: {
          include: {
            providerPreset: true
          }
        }
      },
      orderBy: [
        {
          isEnabled: "desc"
        },
        {
          updatedAt: "desc"
        }
      ]
    });

    return supportedModels.map((modelName) => {
      const candidates = models.filter((model) => model.providerModelName === modelName);
      const available = candidates.find((model) => model.isEnabled && model.providerInstance.status === "ENABLED");
      const enabled = candidates.find((model) => model.isEnabled);
      const selected = available ?? enabled ?? candidates[0] ?? null;
      const aliases = candidates.flatMap((model) =>
        model.aliases
          .filter((alias) => isAudioModelAliasKey(alias.aliasKey))
          .map((alias) => ({
            aliasKey: alias.aliasKey,
            displayName: alias.displayName
          }))
      );

      return {
        modelName,
        isAvailable: Boolean(available),
        isEnabled: Boolean(selected?.isEnabled),
        providerStatus: selected?.providerInstance.status ?? null,
        providerName: selected?.providerInstance.name ?? null,
        statusName: available
          ? "可用"
          : candidates.length === 0
            ? "未创建模型实例"
            : selected?.isEnabled
              ? "Provider 未通过测试"
              : "模型未启用",
        aliases
      };
    });
  }

  async listModelOptions() {
    await this.ensureDashScopeAudioDefaults();
    const creditsPerCny = await this.getCreditsPerCny();

    const aliases = await this.prisma.aiModelAlias.findMany({
      where: {
        aliasKey: {
          in: [...audioModelAliases]
        }
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
      },
      orderBy: {
        createdAt: "asc"
      }
    });
    const aliasMap = new Map(aliases.map((alias) => [alias.aliasKey, alias]));

    return audioModelAliases.map((aliasKey) => {
      const alias = aliasMap.get(aliasKey);
      const model = alias?.modelInstance;
      const provider = model?.providerInstance;
      const preset = provider?.providerPreset;
      const isConfigured = Boolean(
        model?.isEnabled &&
          provider?.status === "ENABLED" &&
          preset?.adapterType === "DASHSCOPE_AUDIO" &&
          preset.modality === "AUDIO"
      );

      return {
        aliasKey,
        displayName: alias?.displayName ?? audioAliasName(aliasKey),
        description: alias?.description ?? null,
        isConfigured,
        providerName: provider?.name ?? preset?.displayName ?? null,
        modelName: model?.providerModelName ?? null,
        capabilityTags: jsonStringArray(model?.capabilityTags),
        inputPrice: model?.inputPrice.toString() ?? "0",
        outputPrice: model?.outputPrice.toString() ?? "0",
        pricingMode: model ? normalizePricingMode(model.pricingMode) : "CHARACTERS",
        pricingUnit: model ? normalizePricingUnit(model.pricingUnit, model.pricingMode) : "TEN_K_CHARACTERS",
        pricingConfig: model?.pricingConfig ?? null,
        creditsPerCny,
        statusName: isConfigured ? "已配置" : "未配置"
      };
    });
  }

  async listAdminAudioModels() {
    await this.ensureDashScopeAudioDefaults();

    const models = await this.prisma.aiModelInstance.findMany({
      where: {
        providerInstance: {
          providerPreset: {
            adapterType: "DASHSCOPE_AUDIO",
            modality: "AUDIO"
          }
        }
      },
      include: adminAudioModelInclude(),
      orderBy: [
        {
          providerInstance: {
            name: "asc"
          }
        },
        {
          displayName: "asc"
        }
      ]
    });

    return models.map((model) => this.toAdminAudioModel(model));
  }

  async updateAdminAudioModel(id: string, dto: UpdateAudioModelDto) {
    const existing = await this.prisma.aiModelInstance.findUnique({
      where: {
        id
      },
      include: adminAudioModelInclude()
    });

    if (!existing) {
      throw new AppException(40401, "语音模型不存在", HttpStatus.NOT_FOUND);
    }

    if (
      existing.providerInstance.providerPreset.adapterType !== "DASHSCOPE_AUDIO" ||
      existing.providerInstance.providerPreset.modality !== "AUDIO"
    ) {
      throw new AppException(40001, "该模型不是语音模型", HttpStatus.BAD_REQUEST);
    }

    const pricingConfig =
      dto.pricingConfig === undefined ? undefined : normalizeModelPricingConfig(dto.pricingConfig);
    const pricingSummary =
      pricingConfig === undefined
        ? null
        : pricingSummaryFromConfig(pricingConfig, {
            inputPrice: dto.inputPrice === undefined ? existing.inputPrice.toString() : String(dto.inputPrice),
            outputPrice: dto.outputPrice === undefined ? existing.outputPrice.toString() : String(dto.outputPrice),
            pricingMode: dto.pricingMode === undefined ? normalizePricingMode(existing.pricingMode) : normalizePricingMode(dto.pricingMode),
            pricingUnit:
              dto.pricingUnit === undefined
                ? normalizePricingUnit(existing.pricingUnit, dto.pricingMode ?? existing.pricingMode)
                : normalizePricingUnit(dto.pricingUnit, dto.pricingMode ?? existing.pricingMode)
          });
    const normalizedCapabilityTags =
      dto.capabilityTags === undefined ? jsonStringArray(existing.capabilityTags) : normalizeCapabilityTags(dto.capabilityTags);
    const nextCapabilityTags =
      dto.capabilityTags === undefined ? undefined : (normalizedCapabilityTags as Prisma.InputJsonValue);
    const modelApiKey = dto.apiKey?.trim();
    const modelApiKeyData = modelApiKey
      ? {
          apiKeyEncrypted: encryptSecret(modelApiKey),
          apiKeyPreview: maskSecret(modelApiKey)
        }
      : dto.clearApiKey
        ? {
            apiKeyEncrypted: null,
            apiKeyPreview: null
          }
        : {};

    await this.prisma.aiModelInstance.update({
      where: {
        id
      },
      data: {
        displayName: dto.displayName === undefined ? undefined : emptyToNull(dto.displayName) ?? existing.displayName,
        providerModelName: dto.modelName === undefined ? undefined : emptyToNull(dto.modelName) ?? existing.providerModelName,
        baseUrl: normalizeOptionalBaseUrl(dto.baseUrl),
        webSocketUrl: dto.webSocketUrl === undefined ? undefined : emptyToNull(dto.webSocketUrl),
        region: dto.region === undefined ? undefined : emptyToNull(dto.region),
        ...modelApiKeyData,
        capabilityTags: nextCapabilityTags,
        inputPrice: pricingSummary ? pricingSummary.inputPrice : dto.inputPrice === undefined ? undefined : String(dto.inputPrice),
        outputPrice: pricingSummary ? pricingSummary.outputPrice : dto.outputPrice === undefined ? undefined : String(dto.outputPrice),
        pricingMode: pricingSummary
          ? pricingSummary.pricingMode
          : dto.pricingMode === undefined
            ? undefined
            : normalizePricingMode(dto.pricingMode),
        pricingUnit: pricingSummary
          ? pricingSummary.pricingUnit
          : dto.pricingUnit === undefined
            ? undefined
            : normalizePricingUnit(dto.pricingUnit, dto.pricingMode ?? existing.pricingMode),
        pricingConfig: pricingConfig === undefined ? undefined : pricingConfigToJson(pricingConfig),
        isEnabled: dto.isEnabled
      }
    });

    const aliasKey = emptyToNull(dto.aliasKey);
    if (aliasKey) {
      if (!isAudioModelAliasKey(aliasKey)) {
        throw new AppException(40001, "不支持的语音模型用途别名", HttpStatus.BAD_REQUEST);
      }

      const requiredCapability = audioAliasRequiredCapability(aliasKey);

      if (requiredCapability && !normalizedCapabilityTags.includes(requiredCapability)) {
        throw new AppException(40001, "该模型不支持所选用途别名", HttpStatus.BAD_REQUEST);
      }

      await this.prisma.aiModelAlias.upsert({
        where: {
          aliasKey
        },
        update: {
          displayName: emptyToNull(dto.aliasDisplayName) ?? audioAliasName(aliasKey),
          description: emptyToNull(dto.aliasDescription),
          modelInstanceId: id
        },
        create: {
          aliasKey,
          displayName: emptyToNull(dto.aliasDisplayName) ?? audioAliasName(aliasKey),
          description: emptyToNull(dto.aliasDescription),
          modelInstanceId: id
        }
      });
    }

    const [updated] = await Promise.all([
      this.prisma.aiModelInstance.findUnique({
        where: {
          id
        },
        include: adminAudioModelInclude()
      })
    ]);

    if (!updated) {
      throw new AppException(40401, "语音模型不存在", HttpStatus.NOT_FOUND);
    }

    return this.toAdminAudioModel(updated);
  }

  async checkAdminAudioModelDelete(modelInstanceId: string) {
    const model = await this.prisma.aiModelInstance.findUnique({
      where: {
        id: modelInstanceId
      },
      include: adminAudioModelInclude()
    });

    if (!model) {
      throw new AppException(40401, "语音模型不存在", HttpStatus.NOT_FOUND);
    }

    if (
      model.providerInstance.providerPreset.adapterType !== "DASHSCOPE_AUDIO" ||
      model.providerInstance.providerPreset.modality !== "AUDIO"
    ) {
      throw new AppException(40001, "该模型不是语音模型", HttpStatus.BAD_REQUEST);
    }

    const aliasKeys = model.aliases.filter((alias) => isAudioModelAliasKey(alias.aliasKey)).map((alias) => alias.aliasKey);
    const scenarioBindings = aliasKeys.length
      ? await this.prisma.aiScenarioModelBinding.findMany({
          where: {
            OR: [
              {
                defaultModelAlias: {
                  in: aliasKeys
                }
              },
              {
                fallbackModelAlias: {
                  in: aliasKeys
                }
              }
            ]
          },
          include: {
            scenario: {
              select: {
                name: true,
                slug: true,
                isEnabled: true
              }
            }
          },
          orderBy: {
            createdAt: "asc"
          }
        })
      : [];
    const boundScenarios = scenarioBindings.map((binding) => ({
      name: binding.scenario.name,
      slug: binding.scenario.slug,
      isEnabled: binding.scenario.isEnabled,
      aliasKey:
        binding.defaultModelAlias && aliasKeys.includes(binding.defaultModelAlias)
          ? binding.defaultModelAlias
          : binding.fallbackModelAlias
    }));

    return {
      modelInstanceId,
      canDelete: boundScenarios.length === 0,
      aliasKeys,
      boundScenarios,
      message:
        boundScenarios.length > 0
          ? `该语音模型仍被 ${boundScenarios.length} 个 AI 场景使用，请先解除模型别名绑定后再删除。`
          : "该语音模型未被 AI 场景使用，可以删除。"
    };
  }

  async deleteAdminAudioModel(modelInstanceId: string) {
    const check = await this.checkAdminAudioModelDelete(modelInstanceId);

    if (!check.canDelete) {
      throw new AppException(40001, check.message, HttpStatus.BAD_REQUEST);
    }

    await this.prisma.$transaction([
      this.prisma.aiModelAlias.updateMany({
        where: {
          modelInstanceId
        },
        data: {
          modelInstanceId: null
        }
      }),
      this.prisma.aiModelInstance.delete({
        where: {
          id: modelInstanceId
        }
      })
    ]);

    return {
      deleted: true,
      modelInstanceId
    };
  }

  async getUsageDashboard(filters: {
    from?: string;
    to?: string;
    operationType?: string;
    model?: string;
  }) {
    const range = normalizeAudioDateRange(filters, 7);
    const where: Prisma.AudioUsageLogWhereInput = {
      createdAt: {
        gte: range.startAt,
        lt: range.endAt
      }
    };

    if (isAudioTaskType(filters.operationType)) {
      where.operationType = filters.operationType;
    }

    if (filters.model?.trim()) {
      where.model = filters.model.trim();
    }

    const [logs, optionRows] = await Promise.all([
      this.prisma.audioUsageLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              nickname: true
            }
          },
          voiceAsset: {
            select: {
              id: true,
              name: true,
              type: true,
              status: true
            }
          },
          task: {
            select: {
              id: true,
              status: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      }),
      this.prisma.audioUsageLog.findMany({
        where: {
          createdAt: {
            gte: range.startAt,
            lt: range.endAt
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      })
    ]);
    const todayKey = audioDateKeyInShanghai(new Date());

    return {
      filters: {
        from: range.from,
        to: range.to,
        operationType: isAudioTaskType(filters.operationType) ? filters.operationType : "",
        model: filters.model?.trim() ?? ""
      },
      total: summarizeAudioUsage(logs),
      today: summarizeAudioUsage(logs.filter((log) => audioDateKeyInShanghai(log.createdAt) === todayKey)),
      trend: range.keys.map((date) => ({
        date,
        ...summarizeAudioUsage(logs.filter((log) => audioDateKeyInShanghai(log.createdAt) === date))
      })),
      byOperation: groupAudioUsage(logs, (log) => log.operationType, (key) => audioTaskTypeName(key)),
      byModel: groupAudioUsage(logs, (log) => log.model, (key) => key),
      byUser: groupAudioUsage(logs, (log) => log.userId, (key, rows) => rows[0]?.user?.nickname ?? rows[0]?.user?.email ?? key),
      byVoice: groupAudioUsage(logs, (log) => log.voiceAssetId ?? "system", (key, rows) => rows[0]?.voiceAsset?.name ?? (key === "system" ? "系统音色" : "未知音色")),
      byStatus: groupAudioUsage(logs, (log) => log.task.status, (key) => audioTaskStatusName(key)),
      recentLogs: logs.slice(0, 50).map((log) => ({
        id: log.id,
        taskId: log.taskId,
        userId: log.userId,
        user: log.user,
        provider: log.provider,
        model: log.model,
        operationType: log.operationType,
        operationTypeName: audioTaskTypeName(log.operationType),
        voiceAssetId: log.voiceAssetId,
        voiceName: log.voiceAsset?.name ?? "系统音色",
        taskStatus: log.task.status,
        taskStatusName: audioTaskStatusName(log.task.status),
        characterCount: log.characterCount,
        audioDurationMs: log.audioDurationMs,
        usageCount: log.usageCount,
        latencyMs: log.latencyMs,
        success: log.success,
        estimatedCost: decimalNumber(log.estimatedCost),
        consumedCredits: log.consumedCredits,
        providerRequestId: log.providerRequestId,
        createdAt: log.createdAt
      })),
      operationTypes: [
        {
          id: "TTS",
          name: audioTaskTypeName("TTS")
        },
        {
          id: "VOICE_DESIGN",
          name: audioTaskTypeName("VOICE_DESIGN")
        },
        {
          id: "VOICE_CLONE",
          name: audioTaskTypeName("VOICE_CLONE")
        }
      ],
      models: Array.from(new Set(optionRows.map((row) => row.model))).map((model) => ({
        id: model,
        name: model
      })),
      updatedAt: new Date()
    };
  }

  async listVoiceAssets(userId: string) {
    const [voices, preference, platformVoices, systemVoiceItems] = await Promise.all([
      this.prisma.voiceAsset.findMany({
        where: {
          userId,
          isPlatform: false,
          status: {
            not: "DELETED"
          }
        },
        include: {
          sourceAudioAsset: true,
          previewAudioAsset: true,
          consent: true,
          targetConsent: true
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 100
      }),
      this.prisma.userAudioPreference.findUnique({
        where: {
          userId
        }
      }),
      this.prisma.voiceAsset.findMany({
        where: {
          isPlatform: true,
          status: "READY",
          providerVoiceId: {
            not: null
          }
        },
        include: {
          sourceAudioAsset: true,
          previewAudioAsset: true,
          consent: true,
          targetConsent: true
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 100
      }),
      this.listSystemVoiceItems()
    ]);

    return {
      systemVoices: systemVoiceItems.filter((voice) => voice.status === "READY").map((voice) => ({
        ...voice,
        typeName: voiceTypeName(voice.type),
        statusName: voiceStatusName(voice.status),
        isDefault: preference?.defaultSystemVoiceId === voice.providerVoiceId
      })),
      platformVoices: platformVoices.map((voice) => ({
        ...this.toVoiceAsset(voice),
        isDefault: preference?.defaultVoiceAssetId === voice.id
      })),
      customVoices: voices.map((voice) => ({
        ...this.toVoiceAsset(voice),
        isDefault: preference?.defaultVoiceAssetId === voice.id
      })),
      defaultVoice: {
        voiceAssetId: preference?.defaultVoiceAssetId ?? null,
        systemVoiceId: preference?.defaultSystemVoiceId ?? null
      }
    };
  }

  async getSafetySettings() {
    return this.audioSafetySettings();
  }

  async listAdminVoiceAssets() {
    const voices = await this.prisma.voiceAsset.findMany({
      include: adminVoiceAssetInclude(),
      orderBy: {
        createdAt: "desc"
      },
      take: 200
    });

    return voices.map((voice) => this.toAdminVoiceAsset(voice));
  }

  async createPlatformVoiceAsset(dto: CreatePlatformVoiceAssetDto, adminUserId: string) {
    const providerVoiceId = dto.providerVoiceId.trim();
    const name = dto.name.trim();

    if (!providerVoiceId || !name) {
      throw new AppException(40001, "请填写平台音色名称和 Provider voice_id", HttpStatus.BAD_REQUEST);
    }

    const model = await this.prisma.aiModelInstance.findUnique({
      where: {
        id: dto.modelInstanceId
      },
      include: {
        providerInstance: {
          include: {
            providerPreset: true
          }
        }
      }
    });

    if (!model) {
      throw new AppException(40401, "语音模型不存在", HttpStatus.NOT_FOUND);
    }

    const capabilityTags = jsonStringArray(model.capabilityTags);
    if (!capabilityTags.includes("TTS")) {
      throw new AppException(40001, "平台音色必须绑定支持语音合成的模型", HttpStatus.BAD_REQUEST);
    }

    const duplicated = await this.prisma.voiceAsset.findFirst({
      where: {
        isPlatform: true,
        providerVoiceId,
        targetModel: model.providerModelName,
        status: {
          not: "DELETED"
        }
      }
    });

    if (duplicated) {
      throw new AppException(40001, "该模型下已存在相同 Provider voice_id 的平台音色", HttpStatus.BAD_REQUEST);
    }

    const owner = await this.ensurePlatformVoiceOwnerUser();
    const voice = await this.prisma.voiceAsset.create({
      data: {
        userId: owner.id,
        providerInstanceId: model.providerInstanceId,
        provider: model.providerInstance.providerPreset.providerKey,
        providerVoiceId,
        name,
        type: dto.type,
        targetModel: model.providerModelName,
        status: "READY",
        visibility: "PUBLIC",
        language: emptyToNull(dto.language),
        description: emptyToNull(dto.description),
        previewAudioUrl: emptyToNull(dto.previewAudioUrl),
        isPlatform: true,
        reviewedByAdminId: adminUserId,
        reviewedAt: new Date(),
        reviewNote: "平台音色由后台添加",
        disabledReason: null
      },
      include: adminVoiceAssetInclude()
    });

    return this.toAdminVoiceAsset(voice);
  }

  async listAdminSystemVoiceAssets(filters: AdminSystemVoiceFilters = {}) {
    const keyword = emptyToNull(filters.keyword)?.toLowerCase();
    const status = emptyToNull(filters.status);
    const language = emptyToNull(filters.language);
    const model = emptyToNull(filters.model);
    const voices = await this.listSystemVoiceItems();

    return voices
      .filter((voice) => {
        if (status && voice.status !== status) {
          return false;
        }

        if (language && !(voice.languages as readonly string[]).includes(language)) {
          return false;
        }

        if (model && !(voice.supportedModels as readonly string[]).includes(model)) {
          return false;
        }

        if (!keyword) {
          return true;
        }

        return [
          voice.name,
          voice.providerVoiceId,
          voice.description,
          voice.trait,
          voice.scene,
          voice.language,
          voice.ageCategory ?? ""
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      })
      .map((voice) => ({
        ...voice,
        typeName: voiceTypeName(voice.type),
        statusName: voiceStatusName(voice.status)
      }));
  }

  async getAdminSystemVoiceAsset(providerVoiceId: string) {
    const voice = await this.findSystemVoiceItem(providerVoiceId);

    if (!voice) {
      throw new AppException(40401, "系统音色不存在", HttpStatus.NOT_FOUND);
    }

    const [operationLogs, modelHealth] = await Promise.all([
      this.listAdminOperationLogs("SYSTEM_VOICE", providerVoiceId),
      this.systemVoiceModelHealth(voice.supportedModels)
    ]);

    return {
      ...voice,
      typeName: voiceTypeName(voice.type),
      statusName: voiceStatusName(voice.status),
      modelHealth,
      operationLogs
    };
  }

  async updateAdminSystemVoice(providerVoiceId: string, dto: UpdateSystemVoiceDto) {
    const voice = systemVoices.find((item) => item.providerVoiceId === providerVoiceId);

    if (!voice) {
      throw new AppException(40401, "系统音色不存在", HttpStatus.NOT_FOUND);
    }

    const overrides = await this.loadSystemVoiceOverrides();
    const currentOverride = overrides[providerVoiceId] ?? {};
    const name = emptyToNull(dto.name);
    const description = emptyToNull(dto.description);
    const trait = emptyToNull(dto.trait);
    const scene = emptyToNull(dto.scene);
    const status = dto.status ?? currentOverride.status ?? "READY";
    const disabledReason = emptyToNull(dto.disabledReason);

    if (status === "DISABLED" && !disabledReason) {
      throw new AppException(40001, "禁用系统音色时请填写原因", HttpStatus.BAD_REQUEST);
    }

    const next: SystemVoiceOverride = {
      ...currentOverride,
      name: name ?? currentOverride.name ?? voice.name,
      description: description ?? currentOverride.description ?? voice.description,
      trait: trait ?? currentOverride.trait ?? voice.trait,
      scene: scene ?? currentOverride.scene ?? voice.scene,
      ageCategory: dto.ageCategory ?? currentOverride.ageCategory ?? voice.ageCategory ?? undefined,
      status,
      disabledReason: status === "DISABLED" ? disabledReason : null,
      updatedAt: new Date().toISOString()
    };

    overrides[providerVoiceId] = next;
    await this.saveSystemVoiceOverrides(overrides);

    return this.getAdminSystemVoiceAsset(providerVoiceId);
  }

  async getAdminVoiceAsset(id: string) {
    const [voice, operationLogs] = await Promise.all([
      this.prisma.voiceAsset.findUnique({
        where: {
          id
        },
        include: adminVoiceAssetInclude()
      }),
      this.listAdminOperationLogs("VOICE_ASSET", id)
    ]);

    if (!voice) {
      throw new AppException(40401, "音色不存在", HttpStatus.NOT_FOUND);
    }

    return {
      ...this.toAdminVoiceAsset(voice),
      operationLogs
    };
  }

  async getAdminAudioAssetFile(id: string) {
    const asset = await this.prisma.audioAsset.findUnique({
      where: {
        id
      }
    });

    if (!asset || asset.type !== "SOURCE_SAMPLE") {
      throw new AppException(40401, "声音样本不存在", HttpStatus.NOT_FOUND);
    }

    if (asset.storageProvider !== "LOCAL") {
      throw new AppException(40001, "当前声音样本暂不支持本地临时访问", HttpStatus.BAD_REQUEST);
    }

    const safeFilename = basename(asset.objectKey);
    const filepath = resolve(audioUploadDir(), safeFilename);

    if (!filepath.startsWith(audioUploadDir()) || !existsSync(filepath)) {
      throw new AppException(40401, "声音样本文件不存在", HttpStatus.NOT_FOUND);
    }

    return {
      filepath,
      filename: safeFilename,
      mimeType: asset.mimeType,
      size: asset.sizeBytes
    };
  }

  async reviewVoiceAsset(id: string, dto: ReviewVoiceAssetDto, adminUserId: string) {
    const action = dto.action;
    const reason = emptyToNull(dto.reason);

    if ((action === "REJECT" || action === "DISABLE") && !reason) {
      throw new AppException(40001, "请填写审核原因", HttpStatus.BAD_REQUEST);
    }

    const existing = await this.prisma.voiceAsset.findUnique({
      where: {
        id
      }
    });

    if (!existing || existing.status === "DELETED") {
      throw new AppException(40401, "音色不存在", HttpStatus.NOT_FOUND);
    }

    if (action === "APPROVE" && !existing.providerVoiceId) {
      throw new AppException(40001, "该音色缺少 Provider Voice ID，不能审核通过", HttpStatus.BAD_REQUEST);
    }

    const data = moderationUpdateData(action, reason, adminUserId);
    await this.prisma.voiceAsset.update({
      where: {
        id
      },
      data
    });

    if (action !== "APPROVE") {
      await this.clearDefaultVoiceReferences(id);
    }

    return this.getAdminVoiceAsset(id);
  }

  async deleteVoiceAssetAsAdmin(id: string, dto: DeleteVoiceAssetAdminDto, adminUserId: string) {
    if (!dto.confirm) {
      throw new AppException(40001, "请先确认删除操作", HttpStatus.BAD_REQUEST);
    }

    const reason = emptyToNull(dto.reason);
    if (!reason) {
      throw new AppException(40001, "请填写删除原因", HttpStatus.BAD_REQUEST);
    }

    const existing = await this.prisma.voiceAsset.findUnique({
      where: {
        id
      }
    });

    if (!existing || existing.status === "DELETED") {
      throw new AppException(40401, "音色不存在", HttpStatus.NOT_FOUND);
    }

    await this.prisma.voiceAsset.update({
      where: {
        id
      },
      data: {
        status: "DELETED",
        reviewedByAdminId: adminUserId,
        reviewedAt: new Date(),
        reviewNote: reason,
        disabledReason: reason,
        deletedAt: new Date()
      }
    });
    await this.clearDefaultVoiceReferences(id);

    return {};
  }

  async uploadAudioAsset(userId: string, type: "SOURCE_SAMPLE" | "PREVIEW" | "TTS_OUTPUT", file: UploadedAudioFileLike | undefined) {
    if (!file) {
      throw new AppException(40001, "请选择要上传的音频文件", HttpStatus.BAD_REQUEST);
    }

    this.assertUploadedAudioFile(file);

    const filename = this.createAudioFilename(file.originalname, file.mimetype);
    const provider = uploadDriver() === "s3" ? "S3" : "LOCAL";
    const url = provider === "S3" ? await this.uploadAudioToS3(filename, file) : await this.uploadAudioToLocal(filename, file);
    const asset = await this.prisma.audioAsset.create({
      data: {
        userId,
        type,
        storageProvider: provider,
        url,
        objectKey: filename,
        mimeType: file.mimetype.toLowerCase(),
        sizeBytes: file.size
      }
    });

    return this.toAudioAsset(asset);
  }

  async createAudioAsset(userId: string, dto: CreateAudioAssetDto) {
    this.assertAudioAsset(dto);

    const asset = await this.prisma.audioAsset.create({
      data: {
        userId,
        type: dto.type,
        storageProvider: dto.storageProvider ?? "LOCAL",
        url: dto.url.trim(),
        objectKey: dto.objectKey.trim(),
        mimeType: dto.mimeType.trim().toLowerCase(),
        durationMs: dto.durationMs ?? null,
        sizeBytes: dto.sizeBytes,
        sampleRate: dto.sampleRate ?? null,
        channels: dto.channels ?? null
      }
    });

    return this.toAudioAsset(asset);
  }

  async listUserAudioAssets(userId: string) {
    const assets = await this.prisma.audioAsset.findMany({
      where: {
        userId
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 100
    });

    return assets.map((asset) => this.toAudioAsset(asset));
  }

  async deleteAudioAsset(userId: string, id: string) {
    const usedCount = await this.prisma.audioTask.count({
      where: {
        userId,
        OR: [
          {
            sourceAudioAssetId: id
          },
          {
            outputAudioAssetId: id
          }
        ]
      }
    });

    if (usedCount > 0) {
      throw new AppException(40001, "音频文件已被任务使用，不能直接删除", HttpStatus.BAD_REQUEST);
    }

    await this.prisma.audioAsset.deleteMany({
      where: {
        id,
        userId
      }
    });

    return {};
  }

  async getLocalAudioFile(filename: string) {
    const safeFilename = basename(filename);
    const asset = await this.prisma.audioAsset.findFirst({
      where: {
        objectKey: safeFilename,
        storageProvider: "LOCAL"
      }
    });

    if (!asset) {
      throw new AppException(40401, "音频文件不存在", HttpStatus.NOT_FOUND);
    }

    const filepath = resolve(audioUploadDir(), safeFilename);

    if (!filepath.startsWith(audioUploadDir()) || !existsSync(filepath)) {
      throw new AppException(40401, "音频文件不存在", HttpStatus.NOT_FOUND);
    }

    return {
      filepath,
      mimeType: asset.mimeType,
      size: asset.sizeBytes
    };
  }

  async createTtsTask(userId: string, dto: CreateTtsAudioTaskDto) {
    const text = dto.text.trim();
    const billingContext = this.billingContextFromDto(dto);
    if (text.length > 8000) {
      throw new AppException(40001, "语音合成文本不能超过 8000 字", HttpStatus.BAD_REQUEST);
    }

    await this.ensureDashScopeAudioDefaults();

    const preferredModel = await this.resolvePreferredTtsModel(dto.voiceAssetId, dto.voice);
    const model = await this.getModelByAlias(
      dto.modelAlias ?? "tts-default",
      "TTS",
      preferredModel.modelNames,
      preferredModel.label
    );
    const voice = await this.resolveVoice(userId, dto.voiceAssetId, dto.voice, model.modelName);
    const pricing = await this.calculatePricingQuote("TTS", model, {
      characterCount: estimatedTtsBillingCharacters(text)
    });
    const estimatedCredits = pricing.estimatedCredits;
    const parameters = normalizeTtsParameters(dto);
    const timeoutMs = ttsGatewayTimeoutMs(text);
    const task = await this.reserveAudioTask({
      userId,
      type: "TTS",
      model,
      estimatedCredits,
      inputText: text,
      voiceAssetId: voice.voiceAssetId ?? undefined,
      providerPayload: {
        voice: voice.providerVoiceId,
        source: dto.source ?? "TOOL",
        parameters,
        timeoutMs,
        pricing: pricingSnapshot(pricing)
      } as unknown as Prisma.InputJsonValue,
      reserveNote: `语音合成冻结 ${estimatedCredits} 点`,
      billingContext
    });

    if (!dto.execute) {
      return this.getUserTask(userId, task.id);
    }

    return this.executeTtsTask(task.id, model, voice.providerVoiceId, text, parameters, timeoutMs);
  }

  async createVoiceCloneTask(userId: string, dto: CreateVoiceCloneTaskDto, request?: HeaderRequestLike) {
    const billingContext = this.billingContextFromDto(dto);

    if (!dto.consentAccepted) {
      throw new AppException(40001, "请先勾选声音授权声明", HttpStatus.BAD_REQUEST);
    }

    await this.ensureDashScopeAudioDefaults();

    const sourceAsset = await this.assertUserAudioAsset(userId, dto.sourceAudioAssetId, "SOURCE_SAMPLE");
    const model = await this.getModelByAlias(dto.modelAlias ?? "voice-clone-default", "VOICE_CLONE");
    const safety = await this.audioSafetySettings();
    const consentType = dto.consentType ?? "SELF_VOICE";
    const ownerName = emptyToNull(dto.ownerName);
    const ownerContact = emptyToNull(dto.ownerContact);
    const consentText = emptyToNull(dto.consentStatement) ?? safety.cloneConsentText;

    if (consentType === "AUTHORIZED_VOICE" && (!ownerName || !ownerContact)) {
      throw new AppException(40001, "使用他人授权声音时，请填写权利人姓名和联系方式", HttpStatus.BAD_REQUEST);
    }

    const pricing = await this.calculatePricingQuote("VOICE_CLONE", model, {
      usageCount: 1
    });
    const estimatedCredits = pricing.estimatedCredits;
    const voiceAsset = await this.prisma.voiceAsset.create({
      data: {
        userId,
        providerInstanceId: model.providerInstanceId,
        provider: model.providerKey,
        name: dto.name.trim(),
        type: "CLONED",
        targetModel: model.modelName,
        status: "CREATING",
        visibility: defaultVoiceVisibility(safety.cloneDefaultVisibility, safety.userPublicVoiceEnabled),
        language: emptyToNull(dto.language),
        description: emptyToNull(dto.description),
        sourceAudioAssetId: sourceAsset.id
      }
    });
    const consent = await this.prisma.voiceConsent.create({
      data: {
        userId,
        voiceAssetId: voiceAsset.id,
        sourceAudioAssetId: sourceAsset.id,
        statement: consentText,
        consentText,
        consentType,
        ownerName,
        ownerContact,
        agreedAt: new Date(),
        ip: request ? getClientIp(request) : null,
        userAgent: request ? getUserAgent(request) : null
      }
    });

    await this.prisma.voiceAsset.update({
      where: {
        id: voiceAsset.id
      },
      data: {
        consentId: consent.id
      }
    });

    const task = await this.reserveAudioTask({
      userId,
      type: "VOICE_CLONE",
      model,
      estimatedCredits,
      sourceAudioAssetId: sourceAsset.id,
      voiceAssetId: voiceAsset.id,
      providerPayload: {
        voiceAssetId: voiceAsset.id,
        source: dto.source ?? "TOOL",
        targetModel: model.modelName,
        pricing: pricingSnapshot(pricing)
      },
      reserveNote: `声音复刻冻结 ${estimatedCredits} 点`,
      billingContext
    });

    await this.executeVoiceCloneTask(task.id, voiceAsset.id, model, sourceAsset.url, dto.name.trim());

    return this.getVoiceAsset(userId, voiceAsset.id);
  }

  async createVoiceDesignTask(userId: string, dto: CreateVoiceDesignTaskDto) {
    const prompt = dto.prompt.trim();
    const billingContext = this.billingContextFromDto(dto);

    await this.ensureDashScopeAudioDefaults();

    const model = await this.getModelByAlias(dto.modelAlias ?? "voice-design-default", "VOICE_DESIGN");
    const safety = await this.audioSafetySettings();
    const pricing = await this.calculatePricingQuote("VOICE_DESIGN", model, {
      usageCount: 1
    });
    const estimatedCredits = pricing.estimatedCredits;
    const voiceAsset = await this.prisma.voiceAsset.create({
      data: {
        userId,
        providerInstanceId: model.providerInstanceId,
        provider: model.providerKey,
        name: dto.name.trim(),
        type: "DESIGNED",
        targetModel: model.modelName,
        status: "CREATING",
        visibility: defaultVoiceVisibility(safety.designDefaultVisibility, safety.userPublicVoiceEnabled),
        language: emptyToNull(dto.language),
        description: prompt
      }
    });

    const task = await this.reserveAudioTask({
      userId,
      type: "VOICE_DESIGN",
      model,
      estimatedCredits,
      inputText: prompt,
      voiceAssetId: voiceAsset.id,
      providerPayload: {
        previewText: emptyToNull(dto.previewText),
        source: dto.source ?? "TOOL",
        targetModel: model.modelName,
        pricing: pricingSnapshot(pricing)
      },
      reserveNote: `声音设计冻结 ${estimatedCredits} 点`,
      billingContext
    });

    await this.executeVoiceDesignTask(task.id, voiceAsset.id, model, prompt, dto.name.trim(), emptyToNull(dto.previewText));

    return this.getVoiceAsset(userId, voiceAsset.id);
  }

  async updateVoiceAsset(userId: string, id: string, dto: UpdateVoiceAssetDto) {
    const name = dto.name?.trim();

    if (!name) {
      throw new AppException(40001, "音色名称不能为空", HttpStatus.BAD_REQUEST);
    }

    const updated = await this.prisma.voiceAsset.updateMany({
      where: {
        id,
        userId,
        status: {
          not: "DELETED"
        }
      },
      data: {
        name
      }
    });

    if (updated.count === 0) {
      throw new AppException(40401, "音色不存在", HttpStatus.NOT_FOUND);
    }

    return this.getVoiceAsset(userId, id);
  }

  async deleteVoiceAsset(userId: string, id: string) {
    const updated = await this.prisma.voiceAsset.updateMany({
      where: {
        id,
        userId,
        status: {
          not: "DELETED"
        }
      },
      data: {
        status: "DELETED"
      }
    });

    if (updated.count === 0) {
      throw new AppException(40401, "音色不存在", HttpStatus.NOT_FOUND);
    }

    await this.clearDefaultVoiceReferences(id);

    return {};
  }

  async setDefaultVoice(userId: string, dto: SetDefaultVoiceDto) {
    const voiceAssetId = emptyToNull(dto.voiceAssetId);
    const systemVoiceId = emptyToNull(dto.systemVoiceId);

    if (voiceAssetId && systemVoiceId) {
      throw new AppException(40001, "默认音色只能选择一种", HttpStatus.BAD_REQUEST);
    }

    if (voiceAssetId) {
      const voice = await this.prisma.voiceAsset.findFirst({
        where: {
          id: voiceAssetId,
          OR: [
            {
              userId,
              isPlatform: false
            },
            {
              isPlatform: true
            }
          ],
          status: "READY"
        }
      });

      if (!voice) {
        throw new AppException(40401, "音色不存在或不可用", HttpStatus.NOT_FOUND);
      }
    }

    if (systemVoiceId) {
      const systemVoice = await this.findSystemVoiceItem(systemVoiceId);

      if (!systemVoice) {
        throw new AppException(40001, "系统音色不存在", HttpStatus.BAD_REQUEST);
      }

      if (systemVoice.status !== "READY") {
        throw new AppException(40001, "该系统音色已禁用，不能设为默认", HttpStatus.BAD_REQUEST);
      }
    }

    await this.prisma.userAudioPreference.upsert({
      where: {
        userId
      },
      update: {
        defaultVoiceAssetId: voiceAssetId,
        defaultSystemVoiceId: systemVoiceId
      },
      create: {
        userId,
        defaultVoiceAssetId: voiceAssetId,
        defaultSystemVoiceId: systemVoiceId
      }
    });

    return this.listVoiceAssets(userId);
  }

  async listUserTasks(userId: string) {
    const tasks = await this.prisma.audioTask.findMany({
      where: {
        userId
      },
      include: audioTaskInclude(),
      orderBy: {
        createdAt: "desc"
      },
      take: 50
    });

    return tasks.map((task) => this.toAudioTask(task));
  }

  async getUserTask(userId: string, id: string) {
    const task = await this.prisma.audioTask.findFirst({
      where: {
        id,
        userId
      },
      include: audioTaskInclude()
    });

    if (!task) {
      throw new AppException(40401, "语音任务不存在", HttpStatus.NOT_FOUND);
    }

    return this.toAudioTask(task);
  }

  async listAdminTasks(filters: AdminAudioTaskListFilters = {}) {
    const where: Prisma.AudioTaskWhereInput = {};

    if (isAudioTaskStatus(filters.status)) {
      where.status = filters.status;
    }

    if (isAudioTaskType(filters.type)) {
      where.type = filters.type;
    }

    const userKeyword = emptyToNull(filters.user);
    if (userKeyword) {
      where.user = {
        OR: [
          {
            email: {
              contains: userKeyword,
              mode: "insensitive"
            }
          },
          {
            nickname: {
              contains: userKeyword,
              mode: "insensitive"
            }
          },
          {
            id: {
              contains: userKeyword,
              mode: "insensitive"
            }
          }
        ]
      };
    }

    const createdAt = adminAudioTaskDateFilter(filters.startTime, filters.endTime);
    if (createdAt) {
      where.createdAt = createdAt;
    }

    const andFilters: Prisma.AudioTaskWhereInput[] = [];
    const providerKeyword = emptyToNull(filters.provider);
    if (providerKeyword) {
      andFilters.push({
        OR: [
          {
            providerInstanceId: providerKeyword
          },
          {
            provider: {
              contains: providerKeyword,
              mode: "insensitive"
            }
          }
        ]
      });
    }

    const modelKeyword = emptyToNull(filters.model);
    if (modelKeyword) {
      andFilters.push({
        OR: [
          {
            modelInstanceId: modelKeyword
          },
          {
            model: {
              contains: modelKeyword,
              mode: "insensitive"
            }
          }
        ]
      });
    }

    if (andFilters.length > 0) {
      where.AND = andFilters;
    }

    const pageSize = parseAdminAudioListPageSize(filters.pageSize, filters.page ? 50 : 100);
    const page = parseAdminAudioListPage(filters.page);
    const tasks = await this.prisma.audioTask.findMany({
      where,
      include: {
        ...audioTaskInclude(),
        user: {
          select: {
            id: true,
            email: true,
            nickname: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      skip: (page - 1) * pageSize,
      take: pageSize
    });

    return tasks.map((task) => this.toAdminAudioTask(task));
  }

  async getAdminTask(id: string) {
    const [task, operationLogs] = await Promise.all([
      this.prisma.audioTask.findUnique({
        where: {
          id
        },
        include: {
          ...audioTaskInclude(),
          user: {
            select: {
              id: true,
              email: true,
              nickname: true
            }
          }
        }
      }),
      this.listAdminOperationLogs("AUDIO_TASK", id)
    ]);

    if (!task) {
      throw new AppException(40401, "语音任务不存在", HttpStatus.NOT_FOUND);
    }

    return {
      ...this.toAdminAudioTask(task),
      operationLogs
    };
  }

  async failAudioTask(taskId: string, errorCode: string, errorMessage: string) {
    return this.releaseFailedAudioTask(taskId, errorCode, errorMessage);
  }

  private async executeTtsTask(
    taskId: string,
    model: ActiveAudioModel,
    providerVoiceId: string,
    text: string,
    parameters: TtsParameters,
    timeoutMs: number
  ) {
    await this.prisma.audioTask.update({
      where: {
        id: taskId
      },
      data: {
        status: "PROCESSING"
      }
    });

    try {
      const apiKey = this.resolveProviderApiKey(model);
      const response = await fetch(`${gatewayBaseUrl()}/audio/tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          baseUrl: model.baseUrl,
          webSocketUrl: model.webSocketUrl,
          apiKey,
          region: model.region,
          model: model.modelName,
          voice: providerVoiceId,
          text,
          timeoutMs,
          ...parameters
        })
      });
      const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;

      if (!response.ok) {
        const detail = payload?.detail as { errorCode?: string; errorMessage?: string } | undefined;
        throw new AudioProviderException(
          detail?.errorCode ?? `AUDIO_PROVIDER_HTTP_${response.status}`,
          detail?.errorMessage ?? "阿里云语音合成失败"
        );
      }

      return this.settleSuccessfulAudioTask(taskId, payload ?? {});
    } catch (error) {
      const code = error instanceof AudioProviderException ? error.code : "AUDIO_PROVIDER_FAILED";
      const message = error instanceof Error ? error.message : "语音任务执行失败";

      return this.releaseFailedAudioTask(taskId, code, message);
    }
  }

  private async executeVoiceCloneTask(
    taskId: string,
    voiceAssetId: string,
    model: ActiveAudioModel,
    sourceAudioUrl: string,
    name: string
  ) {
    await this.markAudioTaskProcessing(taskId);

    try {
      const payload = await this.callAudioGateway("/audio/voices/clone", model, {
        targetModel: model.modelName,
        sourceAudioUrl,
        name
      });
      await this.markVoiceSucceeded(voiceAssetId, payload);

      return this.settleSuccessfulAudioTask(taskId, payload);
    } catch (error) {
      await this.markVoiceFailed(voiceAssetId, providerErrorMessage(error));

      return this.releaseFailedAudioTask(
        taskId,
        error instanceof AudioProviderException ? error.code : "VOICE_CLONE_FAILED",
        providerErrorMessage(error)
      );
    }
  }

  private async executeVoiceDesignTask(
    taskId: string,
    voiceAssetId: string,
    model: ActiveAudioModel,
    voicePrompt: string,
    name: string,
    previewText: string | null
  ) {
    await this.markAudioTaskProcessing(taskId);

    try {
      const payload = await this.callAudioGateway("/audio/voices/design", model, {
        targetModel: model.modelName,
        voicePrompt,
        name,
        previewText
      });
      await this.markVoiceSucceeded(voiceAssetId, payload);

      return this.settleSuccessfulAudioTask(taskId, payload);
    } catch (error) {
      await this.markVoiceFailed(voiceAssetId, providerErrorMessage(error));

      return this.releaseFailedAudioTask(
        taskId,
        error instanceof AudioProviderException ? error.code : "VOICE_DESIGN_FAILED",
        providerErrorMessage(error)
      );
    }
  }

  private async callAudioGateway(path: string, model: ActiveAudioModel, body: Record<string, unknown>) {
    const apiKey = this.resolveProviderApiKey(model);
    const response = await fetch(`${gatewayBaseUrl()}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        baseUrl: model.baseUrl,
        webSocketUrl: model.webSocketUrl,
        apiKey,
        region: model.region,
        ...body
      })
    });
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;

    if (!response.ok) {
      const detail = payload?.detail as { errorCode?: string; errorMessage?: string } | undefined;
      throw new AudioProviderException(
        detail?.errorCode ?? `AUDIO_PROVIDER_HTTP_${response.status}`,
        detail?.errorMessage ?? "阿里云语音接口调用失败"
      );
    }

    return payload ?? {};
  }

  private async markAudioTaskProcessing(taskId: string) {
    await this.prisma.audioTask.update({
      where: {
        id: taskId
      },
      data: {
        status: "PROCESSING"
      }
    });
  }

  private async markVoiceSucceeded(voiceAssetId: string, payload: Record<string, unknown>) {
    const providerVoiceId = extractProviderVoiceId(payload);

    if (!providerVoiceId) {
      throw new AudioProviderException("VOICE_ID_MISSING", "阿里云语音接口未返回音色 ID");
    }

    const asset = await this.prisma.voiceAsset.findUnique({
      where: {
        id: voiceAssetId
      },
      select: {
        type: true
      }
    });
    const needsReview = asset ? await this.voiceReviewRequired(asset.type) : true;

    await this.prisma.voiceAsset.update({
      where: {
        id: voiceAssetId
      },
      data: {
        providerVoiceId,
        previewAudioUrl: extractAudioUrl(payload),
        status: needsReview ? "PENDING_REVIEW" : "READY"
      }
    });
  }

  private async markVoiceFailed(voiceAssetId: string, errorMessage: string) {
    await this.prisma.voiceAsset.update({
      where: {
        id: voiceAssetId
      },
      data: {
        status: "FAILED",
        description: errorMessage
      }
    });
  }

  private async reserveAudioTask(input: {
    userId: string;
    type: AudioTaskType;
    model: ActiveAudioModel;
    estimatedCredits: number;
    inputText?: string;
    sourceAudioAssetId?: string;
    voiceAssetId?: string;
    providerPayload?: Prisma.InputJsonValue;
    reserveNote: string;
    billingContext: BillingContextOptions;
  }) {
    if (input.billingContext.billingContext === "ORGANIZATION") {
      if (!input.billingContext.organizationId) {
        throw new AppException(40001, "请选择要使用的企业空间", HttpStatus.BAD_REQUEST);
      }

      if (!this.organizationsService) {
        throw new AppException(50001, "企业账号服务未初始化", HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const task = await this.prisma.audioTask.create({
        data: {
          userId: input.userId,
          billingContext: "ORGANIZATION",
          organizationId: input.billingContext.organizationId,
          type: input.type,
          status: "CREATED",
          provider: input.model.providerKey,
          model: input.model.modelName,
          providerInstanceId: input.model.providerInstanceId,
          modelInstanceId: input.model.modelInstanceId,
          voiceAssetId: input.voiceAssetId ?? null,
          inputText: input.inputText ?? null,
          inputTextLength: input.inputText?.length ?? 0,
          sourceAudioAssetId: input.sourceAudioAssetId ?? null,
          estimatedCredits: input.estimatedCredits,
          providerPayload: input.providerPayload ?? undefined
        }
      });

      try {
        const reservation = await this.organizationsService.reserveEnterpriseUsage({
          userId: input.userId,
          orgId: input.billingContext.organizationId,
          points: input.estimatedCredits,
          featureCode: audioEnterpriseFeatureCode(input.type),
          usageRequestId: this.enterpriseUsageRequestId(task.id),
          resourceType: "audio_task",
          resourceId: task.id
        });

        return this.prisma.audioTask.update({
          where: {
            id: task.id
          },
          data: {
            status: "RESERVED",
            organizationMemberId: reservation.memberId
          }
        });
      } catch (error) {
        await this.prisma.audioTask.update({
          where: {
            id: task.id
          },
          data: {
            status: "FAILED",
            errorCode: "ENTERPRISE_RESERVE_FAILED",
            errorMessage: error instanceof Error ? error.message : "企业额度预占失败",
            finishedAt: new Date()
          }
        });
        throw error;
      }
    }

    return this.prisma.$transaction(async (transaction) => {
      const task = await transaction.audioTask.create({
        data: {
          userId: input.userId,
          billingContext: "PERSONAL",
          type: input.type,
          status: "CREATED",
          provider: input.model.providerKey,
          model: input.model.modelName,
          providerInstanceId: input.model.providerInstanceId,
          modelInstanceId: input.model.modelInstanceId,
          voiceAssetId: input.voiceAssetId ?? null,
          inputText: input.inputText ?? null,
          inputTextLength: input.inputText?.length ?? 0,
          sourceAudioAssetId: input.sourceAudioAssetId ?? null,
          estimatedCredits: input.estimatedCredits,
          providerPayload: input.providerPayload ?? undefined
        }
      });

      await this.ensureWallet(transaction, input.userId);

      const walletChanged = await transaction.wallet.updateMany({
        where: {
          userId: input.userId,
          availableCredits: {
            gte: input.estimatedCredits
          }
        },
        data: {
          availableCredits: {
            decrement: input.estimatedCredits
          },
          frozenCredits: {
            increment: input.estimatedCredits
          }
        }
      });

      if (walletChanged.count === 0) {
        throw new AppException(40004, "点数余额不足，请先充值", HttpStatus.BAD_REQUEST);
      }

      const wallet = await transaction.wallet.findUniqueOrThrow({
        where: {
          userId: input.userId
        }
      });

      await transaction.creditReservation.create({
        data: {
          userId: input.userId,
          audioTaskId: task.id,
          amount: input.estimatedCredits,
          status: "RESERVED",
          idempotencyKey: `audio-task:${task.id}:reserve`,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000)
        }
      });

      await transaction.ledgerEntry.create({
        data: {
          userId: input.userId,
          type: "RESERVE",
          amount: -input.estimatedCredits,
          balanceAfter: wallet.availableCredits,
          relatedAudioTaskId: task.id,
          relatedTaskType: "AUDIO",
          operationType: input.type,
          idempotencyKey: `audio-task:${task.id}:ledger-reserve`,
          note: input.reserveNote
        }
      });

      return transaction.audioTask.update({
        where: {
          id: task.id
        },
        data: {
          status: "RESERVED"
        }
      });
    });
  }

  private async settleSuccessfulAudioTask(taskId: string, providerPayload: Record<string, unknown>) {
    const initialTask = await this.prisma.audioTask.findUnique({
      where: {
        id: taskId
      },
      include: {
        reservation: true
      }
    });

    if (!initialTask) {
      throw new AppException(40401, "语音任务不存在", HttpStatus.NOT_FOUND);
    }

    if (initialTask.billingContext === "ORGANIZATION") {
      if (!this.organizationsService) {
        throw new AppException(50001, "企业账号服务未初始化", HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const mergedProviderPayload = mergeProviderPayload(initialTask.providerPayload, providerPayload);
      const actualCredits = calculateActualCreditsFromTask(initialTask, providerPayload);

      await this.organizationsService.settleEnterpriseUsage({
        usageRequestId: this.enterpriseUsageRequestId(initialTask.id),
        actualPoints: actualCredits,
        featureCode: audioEnterpriseFeatureCode(initialTask.type),
        resourceType: "audio_task",
        resourceId: initialTask.id,
        usageQuantity: billableCharacterCountForTask(initialTask, providerPayload),
        usageUnit: "character"
      });

      await this.prisma.$transaction(async (transaction) => {
        const outputAudioAssetId = await this.createOutputAudioAsset(transaction, initialTask.userId, providerPayload);

        await transaction.audioTask.update({
          where: {
            id: initialTask.id
          },
          data: {
            status: "SUCCEEDED",
            outputAudioAssetId,
            actualCredits,
            errorCode: null,
            errorMessage: null,
            requestId: extractProviderRequestId(providerPayload),
            providerPayload: mergedProviderPayload as Prisma.InputJsonValue,
            finishedAt: new Date()
          }
        });

        await this.writeAudioUsageLog(transaction, initialTask, {
          success: true,
          consumedCredits: actualCredits,
          providerPayload
        });
      });

      return this.getUserTask(initialTask.userId, initialTask.id);
    }

    const result = await this.prisma.$transaction(async (transaction) => {
      const task = await transaction.audioTask.findUnique({
        where: {
          id: taskId
        },
        include: {
          reservation: true
        }
      });

      if (!task || !task.reservation) {
        throw new AppException(40401, "语音任务不存在", HttpStatus.NOT_FOUND);
      }

      if (task.reservation.status !== "RESERVED") {
        return {
          userId: task.userId,
          taskId: task.id
        };
      }

      const mergedProviderPayload = mergeProviderPayload(task.providerPayload, providerPayload);
      const actualCredits = calculateActualCreditsFromTask(task, providerPayload);
      const reservedCredits = task.reservation.amount;
      const releaseCredits = Math.max(0, reservedCredits - actualCredits);
      const extraCredits = Math.max(0, actualCredits - reservedCredits);
      const wallet = await transaction.wallet.update({
        where: {
          userId: task.userId
        },
        data: {
          availableCredits: {
            increment: releaseCredits - extraCredits
          },
          frozenCredits: {
            decrement: reservedCredits
          },
          totalConsumedCredits: {
            increment: actualCredits
          }
        }
      });

      await transaction.creditReservation.update({
        where: {
          id: task.reservation.id
        },
        data: {
          status: "SETTLED"
        }
      });

      await transaction.ledgerEntry.create({
        data: {
          userId: task.userId,
          type: "CONSUME",
          amount: -actualCredits,
          balanceAfter: wallet.availableCredits,
          relatedAudioTaskId: task.id,
          relatedTaskType: "AUDIO",
          operationType: task.type,
          idempotencyKey: `audio-task:${task.id}:consume`,
          note: `语音任务消耗 ${actualCredits} 点`
        }
      });

      if (releaseCredits > 0) {
        await transaction.ledgerEntry.create({
          data: {
            userId: task.userId,
            type: "RELEASE",
            amount: releaseCredits,
            balanceAfter: wallet.availableCredits,
            relatedAudioTaskId: task.id,
            relatedTaskType: "AUDIO",
            operationType: task.type,
            idempotencyKey: `audio-task:${task.id}:release`,
            note: `语音任务释放多余冻结 ${releaseCredits} 点`
          }
        });
      }

      const outputAudioAssetId = await this.createOutputAudioAsset(transaction, task.userId, providerPayload);

      await transaction.audioTask.update({
        where: {
          id: task.id
        },
        data: {
          status: "SUCCEEDED",
          outputAudioAssetId,
          actualCredits,
          errorCode: null,
          errorMessage: null,
          requestId: extractProviderRequestId(providerPayload),
          providerPayload: mergedProviderPayload as Prisma.InputJsonValue,
          finishedAt: new Date()
        }
      });

      await this.writeAudioUsageLog(transaction, task, {
        success: true,
        consumedCredits: actualCredits,
        providerPayload
      });

      return {
        userId: task.userId,
        taskId: task.id
      };
    });

    return this.getUserTask(result.userId, result.taskId);
  }

  private async releaseFailedAudioTask(taskId: string, errorCode: string, errorMessage: string) {
    const initialTask = await this.prisma.audioTask.findUnique({
      where: {
        id: taskId
      },
      include: {
        reservation: true
      }
    });

    if (!initialTask) {
      throw new AppException(40401, "语音任务不存在", HttpStatus.NOT_FOUND);
    }

    if (initialTask.billingContext === "ORGANIZATION") {
      if (!this.organizationsService) {
        throw new AppException(50001, "企业账号服务未初始化", HttpStatus.INTERNAL_SERVER_ERROR);
      }

      await this.organizationsService.releaseEnterpriseUsage({
        usageRequestId: this.enterpriseUsageRequestId(initialTask.id),
        reason: `语音任务失败释放企业预占点数`
      });

      await this.prisma.$transaction(async (transaction) => {
        await transaction.audioTask.update({
          where: {
            id: initialTask.id
          },
          data: {
            status: "FAILED",
            errorCode,
            errorMessage,
            finishedAt: new Date()
          }
        });

        await this.writeAudioUsageLog(transaction, initialTask, {
          success: false,
          consumedCredits: 0,
          providerPayload: {
            errorCode,
            errorMessage
          }
        });
      });

      return this.getUserTask(initialTask.userId, initialTask.id);
    }

    const result = await this.prisma.$transaction(async (transaction) => {
      const task = await transaction.audioTask.findUnique({
        where: {
          id: taskId
        },
        include: {
          reservation: true
        }
      });

      if (!task || !task.reservation) {
        throw new AppException(40401, "语音任务不存在", HttpStatus.NOT_FOUND);
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
            relatedAudioTaskId: task.id,
            relatedTaskType: "AUDIO",
            operationType: task.type,
            idempotencyKey: `audio-task:${task.id}:release-failed`,
            note: `语音任务失败释放冻结 ${task.reservation.amount} 点`
          }
        });
      }

      await transaction.audioTask.update({
        where: {
          id: task.id
        },
        data: {
          status: "FAILED",
          errorCode,
          errorMessage,
          finishedAt: new Date()
        }
      });

      await this.writeAudioUsageLog(transaction, task, {
        success: false,
        consumedCredits: 0,
        providerPayload: {
          errorCode,
          errorMessage
        }
      });

      return {
        userId: task.userId,
        taskId: task.id
      };
    });

    return this.getUserTask(result.userId, result.taskId);
  }

  private async createOutputAudioAsset(
    transaction: Prisma.TransactionClient,
    userId: string,
    providerPayload: Record<string, unknown>
  ) {
    const audioUrl = extractAudioUrl(providerPayload);

    if (!audioUrl) {
      return null;
    }

    const asset = await transaction.audioAsset.create({
      data: {
        userId,
        type: "TTS_OUTPUT",
        storageProvider: "LOCAL",
        url: audioUrl,
        objectKey: `provider-output-${Date.now()}`,
        mimeType: mimeTypeFromAudioUrl(audioUrl),
        sizeBytes: 0
      }
    });

    return asset.id;
  }

  private async getModelByAlias(
    aliasKey: string,
    capability: "TTS" | "VOICE_CLONE" | "VOICE_DESIGN",
    preferredModelNames: string[] = [],
    preferredContextLabel: string | null = null
  ) {
    const preferredModels = Array.from(new Set(preferredModelNames.map((item) => item.trim()).filter(Boolean)));
    const alias = await this.prisma.aiModelAlias.findUnique({
      where: {
        aliasKey
      },
      include: {
        modelInstance: {
          include: activeAudioModelInclude()
        }
      }
    });
    const model = alias?.modelInstance;

    if (!model || !model.providerInstance?.providerPreset) {
      const fallback = await this.findFallbackAudioModel(capability, aliasKey, preferredModels);
      if (fallback) {
        return fallback;
      }

      throw new AppException(
        40001,
        this.audioModelUnavailableMessage(aliasKey, preferredModels, preferredContextLabel),
        HttpStatus.BAD_REQUEST
      );
    }

    const providerInstance = model.providerInstance;
    const providerPreset = providerInstance.providerPreset;

    if (!model.isEnabled || providerInstance.status !== "ENABLED") {
      if (preferredModels.length > 0) {
        const fallback = await this.findFallbackAudioModel(capability, aliasKey, preferredModels);
        if (fallback) {
          return fallback;
        }

        throw new AppException(
          40001,
          this.audioModelUnavailableMessage(aliasKey, preferredModels, preferredContextLabel),
          HttpStatus.BAD_REQUEST
        );
      }

      if (!model.isEnabled) {
        throw new AppException(40001, `模型别名 ${aliasKey} 对应模型未启用`, HttpStatus.BAD_REQUEST);
      }

      throw new AppException(
        40001,
        `模型别名 ${aliasKey} 所属 Provider 未通过测试，请在后台重新测试或检查 API Key`,
        HttpStatus.BAD_REQUEST
      );
    }

    if (providerPreset.adapterType !== "DASHSCOPE_AUDIO" || providerPreset.modality !== "AUDIO") {
      throw new AppException(40001, `模型别名 ${aliasKey} 不是语音模型`, HttpStatus.BAD_REQUEST);
    }

    const capabilityTags = jsonStringArray(model.capabilityTags);

    if (!capabilityTags.includes(capability)) {
      throw new AppException(40001, `模型别名 ${aliasKey} 不支持当前语音任务`, HttpStatus.BAD_REQUEST);
    }

    if (preferredModels.length > 0 && !preferredModels.includes(model.providerModelName)) {
      const fallback = await this.findFallbackAudioModel(capability, aliasKey, preferredModels);
      if (fallback) {
        return fallback;
      }

      throw new AppException(
        40001,
        this.audioModelUnavailableMessage(aliasKey, preferredModels, preferredContextLabel),
        HttpStatus.BAD_REQUEST
      );
    }

    return this.toActiveAudioModel(model, capability) as ActiveAudioModel;
  }

  private audioModelUnavailableMessage(
    aliasKey: string,
    preferredModelNames: string[],
    preferredContextLabel: string | null
  ) {
    if (preferredModelNames.length > 0) {
      return `${preferredContextLabel ?? "所选音色"} 需要启用 ${preferredModelNames.join(" 或 ")}，并通过阿里云百炼语音 Provider 测试`;
    }

    return `模型别名 ${aliasKey} 尚未绑定可用模型`;
  }

  private async findFallbackAudioModel(
    capability: "TTS" | "VOICE_CLONE" | "VOICE_DESIGN",
    aliasKey: string,
    preferredModelNames: string[]
  ) {
    const candidates = await this.prisma.aiModelInstance.findMany({
      where: {
        isEnabled: true,
        ...(preferredModelNames.length > 0
          ? {
              providerModelName: {
                in: preferredModelNames
              }
            }
          : {}),
        providerInstance: {
          status: "ENABLED",
          providerPreset: {
            adapterType: "DASHSCOPE_AUDIO",
            modality: "AUDIO"
          }
        }
      },
      include: activeAudioModelInclude(),
      orderBy: {
        updatedAt: "desc"
      },
      take: 50
    });
    const ranked = candidates
      .map((model) => ({
        model,
        activeModel: this.toActiveAudioModel(model, capability),
        preferredIndex: preferredModelNames.indexOf(model.providerModelName),
        aliasScore: model.modelPreset?.recommendedAlias === aliasKey ? 0 : 1
      }))
      .filter((item): item is { model: ActiveAudioModelRecord; activeModel: ActiveAudioModel; preferredIndex: number; aliasScore: number } =>
        Boolean(item.activeModel)
      )
      .sort((left, right) => {
        const leftPreferred = left.preferredIndex === -1 ? Number.MAX_SAFE_INTEGER : left.preferredIndex;
        const rightPreferred = right.preferredIndex === -1 ? Number.MAX_SAFE_INTEGER : right.preferredIndex;

        return leftPreferred - rightPreferred || left.aliasScore - right.aliasScore;
      });

    return ranked[0]?.activeModel ?? null;
  }

  private toActiveAudioModel(
    model: ActiveAudioModelRecord,
    capability: "TTS" | "VOICE_CLONE" | "VOICE_DESIGN"
  ): ActiveAudioModel | null {
    const providerInstance = model.providerInstance;
    const providerPreset = providerInstance.providerPreset;

    if (!model.isEnabled || providerInstance.status !== "ENABLED") {
      return null;
    }

    if (providerPreset.adapterType !== "DASHSCOPE_AUDIO" || providerPreset.modality !== "AUDIO") {
      return null;
    }

    const capabilityTags = jsonStringArray(model.capabilityTags);

    if (!capabilityTags.includes(capability)) {
      return null;
    }

    return {
      modelInstanceId: model.id,
      providerInstanceId: providerInstance.id,
      providerKey: providerPreset.providerKey,
      providerName: providerInstance.name,
      providerDisplayName: providerPreset.displayName,
      adapterType: providerPreset.adapterType,
      modelName: model.providerModelName,
      baseUrl: normalizeBaseUrl(model.baseUrl || providerInstance.baseUrl),
      webSocketUrl: model.webSocketUrl ?? providerInstance.webSocketUrl,
      region: model.region ?? providerInstance.region ?? providerPreset.region,
      apiKeyEncrypted: model.apiKeyEncrypted ?? providerInstance.credential?.apiKeyEncrypted ?? null,
      apiKeyEnvName: providerPreset.apiKeyEnvName,
      capabilityTags,
      inputPrice: decimalNumber(model.inputPrice),
      outputPrice: decimalNumber(model.outputPrice),
      pricingMode: normalizePricingMode(model.pricingMode),
      pricingUnit: normalizePricingUnit(model.pricingUnit, model.pricingMode),
      pricingConfig: model.pricingConfig
    } satisfies ActiveAudioModel;
  }

  private async resolvePreferredTtsModel(voiceAssetId: string | undefined, voice: string | undefined) {
    if (voiceAssetId) {
      return {
        modelNames: [] as string[],
        label: null as string | null
      };
    }

    const providerVoiceId = emptyToNull(voice);
    if (!providerVoiceId) {
      return {
        modelNames: [] as string[],
        label: null
      };
    }

    const systemVoice = await this.findSystemVoiceItem(providerVoiceId);

    return {
      modelNames: systemVoice ? [...systemVoice.supportedModels] : [],
      label: systemVoice ? `所选音色 ${systemVoice.providerVoiceId}` : `所选音色 ${providerVoiceId}`
    };
  }

  private async listSystemVoiceItems() {
    const overrides = await this.loadSystemVoiceOverrides();

    return systemVoices.map((voice) => applySystemVoiceOverride(voice, overrides[voice.providerVoiceId]));
  }

  private async findSystemVoiceItem(providerVoiceId: string) {
    const voice = systemVoices.find((item) => item.providerVoiceId === providerVoiceId);

    if (!voice) {
      return null;
    }

    const overrides = await this.loadSystemVoiceOverrides();

    return applySystemVoiceOverride(voice, overrides[providerVoiceId]);
  }

  private async loadSystemVoiceOverrides() {
    const config = await this.prisma.systemConfig.findUnique({
      where: {
        key: systemVoiceOverrideConfigKey
      }
    });

    if (!config?.value) {
      return {};
    }

    try {
      const parsed = JSON.parse(config.value) as unknown;

      if (!isPlainRecord(parsed)) {
        return {};
      }

      const overrides: Record<string, SystemVoiceOverride> = {};

      for (const [key, value] of Object.entries(parsed)) {
        if (!isPlainRecord(value)) {
          continue;
        }

        const override = normalizeSystemVoiceOverride(value);
        if (override) {
          overrides[key] = override;
        }
      }

      return overrides;
    } catch {
      return {};
    }
  }

  private async saveSystemVoiceOverrides(overrides: Record<string, SystemVoiceOverride>) {
    await this.prisma.systemConfig.upsert({
      where: {
        key: systemVoiceOverrideConfigKey
      },
      update: {
        value: JSON.stringify(overrides)
      },
      create: {
        key: systemVoiceOverrideConfigKey,
        label: "CosyVoice 系统音色覆盖配置",
        value: JSON.stringify(overrides),
        description: "后台对官方 CosyVoice 系统音色的名称、描述、启停等覆盖配置。",
        group: "audio",
        isPublic: false,
        sortOrder: 360
      }
    });
  }

  private async resolveVoice(
    userId: string,
    voiceAssetId: string | undefined,
    voice: string | undefined,
    modelName: string
  ) {
    if (!voiceAssetId) {
      const providerVoiceId = emptyToNull(voice);

      if (!providerVoiceId) {
        throw new AppException(40001, "请选择系统音色或自定义音色", HttpStatus.BAD_REQUEST);
      }

      const systemVoice = await this.findSystemVoiceItem(providerVoiceId);
      if (systemVoice?.status === "DISABLED") {
        throw new AppException(
          40001,
          `系统音色「${systemVoice.name}」已禁用，不能用于合成`,
          HttpStatus.BAD_REQUEST
        );
      }

      if (systemVoice && !(systemVoice.supportedModels as readonly string[]).includes(modelName)) {
        throw new AppException(
          40001,
          `系统音色「${systemVoice.name}」不支持当前模型 ${modelName}`,
          HttpStatus.BAD_REQUEST
        );
      }

      return {
        voiceAssetId: null,
        providerVoiceId
      };
    }

    const asset = await this.prisma.voiceAsset.findFirst({
      where: {
        id: voiceAssetId,
        OR: [
          {
            userId,
            isPlatform: false
          },
          {
            isPlatform: true
          }
        ]
      }
    });

    if (!asset) {
      throw new AppException(40401, "音色不存在", HttpStatus.NOT_FOUND);
    }

    if (asset.status !== "READY") {
      throw new AppException(40001, "该音色尚未就绪，不能用于语音合成", HttpStatus.BAD_REQUEST);
    }

    if (!asset.providerVoiceId) {
      throw new AppException(40001, "该音色缺少 Provider Voice ID", HttpStatus.BAD_REQUEST);
    }

    if (asset.targetModel !== modelName) {
      throw new AppException(40001, "自定义音色与当前合成模型不匹配", HttpStatus.BAD_REQUEST);
    }

    return {
      voiceAssetId: asset.id,
      providerVoiceId: asset.providerVoiceId
    };
  }

  private async assertUserAudioAsset(userId: string, id: string, type: "SOURCE_SAMPLE") {
    const asset = await this.prisma.audioAsset.findFirst({
      where: {
        id,
        userId,
        type
      }
    });

    if (!asset) {
      throw new AppException(40401, "声音样本不存在", HttpStatus.NOT_FOUND);
    }

    return asset;
  }

  private async getVoiceAsset(userId: string, id: string) {
    const asset = await this.prisma.voiceAsset.findFirst({
      where: {
        id,
        userId,
        isPlatform: false
      },
      include: {
        sourceAudioAsset: true,
        previewAudioAsset: true,
        consent: true,
        targetConsent: true
      }
    });

    if (!asset) {
      throw new AppException(40401, "音色不存在", HttpStatus.NOT_FOUND);
    }

    return {
      id: asset.id,
      userId: asset.userId,
      provider: asset.provider,
      providerVoiceId: asset.providerVoiceId,
      name: asset.name,
      type: asset.type,
      typeName: voiceTypeName(asset.type),
      targetModel: asset.targetModel,
      status: asset.status,
      statusName: voiceStatusName(asset.status),
      visibility: asset.visibility,
      language: asset.language,
      description: asset.description,
      previewAudioUrl: asset.previewAudioUrl,
      sourceAudioAsset: asset.sourceAudioAsset ? this.toAudioAsset(asset.sourceAudioAsset) : null,
      previewAudioAsset: asset.previewAudioAsset ? this.toAudioAsset(asset.previewAudioAsset) : null,
      consent: this.toVoiceConsent(asset.consent ?? asset.targetConsent ?? null),
      reviewNote: asset.reviewNote,
      disabledReason: asset.disabledReason,
      reviewedAt: asset.reviewedAt,
      deletedAt: asset.deletedAt,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt
    };
  }

  private async ensurePlatformVoiceOwnerUser() {
    const email = "platform-voice@aisaas.local";
    const existing = await this.prisma.user.findUnique({
      where: {
        email
      }
    });

    if (existing) {
      return existing;
    }

    return this.prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(randomBytes(24).toString("hex")),
        nickname: "平台音色",
        status: "ACTIVE"
      }
    });
  }

  private resolveProviderApiKey(model: ActiveAudioModel) {
    if (model.apiKeyEncrypted) {
      try {
        return decryptSecret(model.apiKeyEncrypted);
      } catch {
        const fallback = process.env[model.apiKeyEnvName]?.trim();

        if (fallback) {
          return fallback;
        }

        throw new AudioProviderException(
          "DASHSCOPE_API_KEY_DECRYPT_FAILED",
          "已保存的阿里云百炼语音 API Key 无法解密，请在后台重新填写或确认 SECRET_ENCRYPTION_KEY"
        );
      }
    }

    const apiKey = process.env[model.apiKeyEnvName]?.trim();

    if (!apiKey) {
      throw new AudioProviderException("DASHSCOPE_API_KEY_MISSING", `尚未配置 ${model.apiKeyEnvName}`);
    }

    return apiKey;
  }

  private async calculatePricingQuote(
    operationType: AudioTaskType,
    model: ActiveAudioModel,
    input: {
      characterCount?: number;
      audioDurationMs?: number | null;
      usageCount?: number;
    }
  ): Promise<AudioPricingQuote> {
    const modelQuote = await this.quoteFromAudioModel(model, input);

    if (!modelQuote) {
      throw new AppException(
        40001,
        `语音模型价格未配置或不支持当前计费方式：${audioTaskTypeName(operationType)} / ${model.modelName}`,
        HttpStatus.BAD_REQUEST
      );
    }

    return modelQuote;
  }

  private async quoteFromAudioModel(
    model: ActiveAudioModel,
    input: {
      characterCount?: number;
      audioDurationMs?: number | null;
      usageCount?: number;
    }
  ) {
    const creditsPerCny = await this.getCreditsPerCny();

    return quoteFromAudioModelPricing(model, input, creditsPerCny);
  }

  private async getCreditsPerCny() {
    const config = await this.prisma.systemConfig.findUnique({
      where: {
        key: "defaultCreditExchangeRate"
      },
      select: {
        value: true
      }
    });

    return parseCreditsPerCny(config?.value);
  }

  private async writeAudioUsageLog(
    transaction: Prisma.TransactionClient,
    task: {
      id: string;
      userId: string;
      provider: string;
      model: string;
      providerInstanceId: string | null;
      modelInstanceId: string | null;
      voiceAssetId: string | null;
      type: AudioTaskType;
      inputText: string | null;
      inputTextLength: number;
      estimatedCredits: number;
      providerPayload: Prisma.JsonValue | null;
    },
    input: {
      success: boolean;
      consumedCredits: number;
      providerPayload: Record<string, unknown>;
    }
  ) {
    const snapshot = pricingSnapshotFromTask(task.providerPayload);
    const durationMs = extractAudioDurationMs(input.providerPayload);
    const characterCount = billableCharacterCountForTask(task, input.providerPayload);
    const usageCount = snapshot
      ? usageCountForPricingSnapshot(snapshot, {
          characterCount,
          audioDurationMs: durationMs,
          usageCount: snapshot.usageCount
        })
      : usageCountForBilling(undefined, {
          characterCount,
          audioDurationMs: durationMs,
          usageCount: 1
        });
    const data = {
      userId: task.userId,
      provider: task.provider,
      model: task.model,
      providerInstanceId: task.providerInstanceId,
      modelInstanceId: task.modelInstanceId,
      voiceAssetId: task.voiceAssetId,
      operationType: task.type,
      characterCount,
      audioDurationMs: durationMs,
      usageCount,
      latencyMs: extractLatencyMs(input.providerPayload),
      success: input.success,
      estimatedCost: actualEstimatedCostFromSnapshot(snapshot, usageCount) ?? estimatedAudioCost(input.providerPayload),
      consumedCredits: input.consumedCredits,
      providerRequestId: extractProviderRequestId(input.providerPayload)
    };

    await transaction.audioUsageLog.upsert({
      where: {
        taskId: task.id
      },
      update: data,
      create: {
        taskId: task.id,
        ...data
      }
    });
  }

  private async ensureWallet(transaction: Prisma.TransactionClient, userId: string) {
    await transaction.wallet.upsert({
      where: {
        userId
      },
      update: {},
      create: {
        userId
      }
    });
  }

  private billingContextFromDto(dto: { billingContext?: BillingContext; organizationId?: string | null }): BillingContextOptions {
    if (dto.billingContext !== "ORGANIZATION") {
      return {
        billingContext: "PERSONAL"
      };
    }

    const organizationId = dto.organizationId?.trim();

    if (!organizationId) {
      throw new AppException(40001, "请选择要使用的企业空间", HttpStatus.BAD_REQUEST);
    }

    return {
      billingContext: "ORGANIZATION",
      organizationId
    };
  }

  private enterpriseUsageRequestId(taskId: string) {
    return `audio-task:${taskId}`;
  }

  private assertAudioAsset(dto: CreateAudioAssetDto) {
    const mimeType = dto.mimeType.trim().toLowerCase();

    if (!allowedAudioMimeTypes.has(mimeType)) {
      throw new AppException(40001, "仅支持 MP3、WAV、WebM、OGG、AAC、MP4 音频文件", HttpStatus.BAD_REQUEST);
    }

    if (dto.sizeBytes <= 0 || dto.sizeBytes > maxAudioUploadBytes()) {
      throw new AppException(40001, `音频文件大小不能超过 ${Math.floor(maxAudioUploadBytes() / 1024 / 1024)}MB`, HttpStatus.BAD_REQUEST);
    }
  }

  private assertUploadedAudioFile(file: UploadedAudioFileLike) {
    const mimeType = file.mimetype.trim().toLowerCase();

    if (!allowedAudioMimeTypes.has(mimeType)) {
      throw new AppException(40001, "仅支持 MP3、WAV、WebM、OGG、AAC、MP4 音频文件", HttpStatus.BAD_REQUEST);
    }

    if (file.size <= 0 || file.size > maxAudioUploadBytes()) {
      throw new AppException(40001, `音频文件大小不能超过 ${Math.floor(maxAudioUploadBytes() / 1024 / 1024)}MB`, HttpStatus.BAD_REQUEST);
    }
  }

  private createAudioFilename(originalName: string, mimeType: string) {
    const extension = audioExtensionFor(originalName, mimeType);
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const hash = randomBytes(8).toString("hex");

    return `${date}-${hash}${extension}`;
  }

  private async uploadAudioToLocal(filename: string, file: UploadedAudioFileLike) {
    const directory = audioUploadDir();
    mkdirSync(directory, {
      recursive: true
    });
    await writeFile(join(directory, filename), file.buffer);

    return `${publicApiBaseUrl()}/audio/files/${filename}`;
  }

  private async uploadAudioToS3(filename: string, file: UploadedAudioFileLike) {
    const config = s3Config();
    const key = `${config.prefix}${filename}`;
    const endpoint = config.endpoint.replace(/\/+$/, "");
    const url = config.pathStyle
      ? `${endpoint}/${config.bucket}/${key}`
      : `${endpoint.replace("://", `://${config.bucket}.`)}/${key}`;
    const parsedUrl = new URL(url);
    const amzDate = amzTimestamp(new Date());
    const payloadHash = createHash("sha256").update(file.buffer).digest("hex");
    const headers: Record<string, string> = {
      "content-type": file.mimetype,
      host: parsedUrl.host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate
    };
    const authorization = signS3Request({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region,
      method: "PUT",
      pathname: parsedUrl.pathname,
      search: parsedUrl.search,
      headers,
      payloadHash,
      amzDate
    });
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        ...headers,
        authorization
      },
      body: file.buffer
    });

    if (!response.ok) {
      throw new AppException(50002, "对象存储上传失败", HttpStatus.BAD_GATEWAY);
    }

    return config.publicBaseUrl ? `${config.publicBaseUrl.replace(/\/+$/, "")}/${key}` : url;
  }

  private async audioSafetySettings() {
    const defaults = defaultAudioSafetySettings();
    const configs = await this.prisma.systemConfig.findMany({
      where: {
        key: {
          in: Object.keys(defaults)
        }
      }
    });
    const values = new Map(configs.map((config) => [config.key, config.value]));
    const userPublicVoiceEnabled = booleanConfig(values.get("audioUserPublicVoiceEnabled"), defaults.audioUserPublicVoiceEnabled);

    return {
      cloneReviewRequired: booleanConfig(values.get("audioVoiceCloneReviewRequired"), defaults.audioVoiceCloneReviewRequired),
      designReviewRequired: booleanConfig(values.get("audioVoiceDesignReviewRequired"), defaults.audioVoiceDesignReviewRequired),
      userPublicVoiceEnabled,
      cloneDefaultVisibility: defaultVoiceVisibility(
        visibilityConfig(values.get("audioCloneDefaultVisibility"), defaults.audioCloneDefaultVisibility),
        userPublicVoiceEnabled
      ),
      designDefaultVisibility: defaultVoiceVisibility(
        visibilityConfig(values.get("audioDesignDefaultVisibility"), defaults.audioDesignDefaultVisibility),
        userPublicVoiceEnabled
      ),
      safetyNotice: values.get("audioSafetyNotice") ?? defaults.audioSafetyNotice,
      cloneConsentText: values.get("audioCloneConsentText") ?? defaults.audioCloneConsentText,
      downloadNotice: values.get("audioDownloadNotice") ?? defaults.audioDownloadNotice
    };
  }

  private async voiceReviewRequired(type: string) {
    const settings = await this.audioSafetySettings();

    if (type === "CLONED") {
      return settings.cloneReviewRequired;
    }

    if (type === "DESIGNED") {
      return settings.designReviewRequired;
    }

    return false;
  }

  private async clearDefaultVoiceReferences(voiceAssetId: string) {
    await this.prisma.userAudioPreference.updateMany({
      where: {
        defaultVoiceAssetId: voiceAssetId
      },
      data: {
        defaultVoiceAssetId: null
      }
    });
  }

  private toAudioAsset(asset: AudioAssetRecord) {
    return {
      id: asset.id,
      userId: asset.userId,
      type: asset.type,
      typeName: audioAssetTypeName(asset.type),
      storageProvider: asset.storageProvider,
      url: asset.url,
      objectKey: asset.objectKey,
      mimeType: asset.mimeType,
      durationMs: asset.durationMs,
      sizeBytes: asset.sizeBytes,
      sampleRate: asset.sampleRate,
      channels: asset.channels,
      createdAt: asset.createdAt
    };
  }

  private toAudioAssetMetadata(asset: AudioAssetRecord) {
    return {
      ...this.toAudioAsset(asset),
      url: null
    };
  }

  private toAdminAudioModel(model: AdminAudioModelRecord) {
    const capabilityTags = jsonStringArray(model.capabilityTags);
    const aliases = model.aliases
      .filter((alias) => isAudioModelAliasKey(alias.aliasKey))
      .map((alias) => ({
        id: alias.id,
        aliasKey: alias.aliasKey,
        displayName: alias.displayName,
        description: alias.description,
        updatedAt: alias.updatedAt
      }));
    const inputPrice = decimalNumber(model.inputPrice);
    const outputPrice = decimalNumber(model.outputPrice);
    const defaultCharacterPricing = model.pricingMode === "TOKENS" && inputPrice === 0 && outputPrice === 0;

    return {
      id: model.id,
      displayName: model.displayName,
      modelName: model.providerModelName,
      provider: model.providerInstance.providerPreset.providerKey,
      providerName: model.providerInstance.name,
      providerDisplayName: model.providerInstance.providerPreset.displayName,
      providerStatus: model.providerInstance.status,
      baseUrl: model.baseUrl,
      webSocketUrl: model.webSocketUrl,
      region: model.region ?? model.providerInstance.region ?? model.providerInstance.providerPreset.region,
      hasCustomApiKey: Boolean(model.apiKeyEncrypted),
      apiKeyPreview: model.apiKeyEncrypted ? model.apiKeyPreview ?? maskSecretPreview(model.apiKeyEncrypted) : "使用 Provider 默认",
      capabilityTags,
      isEnabled: model.isEnabled,
      statusName: model.isEnabled ? "启用" : "停用",
      inputPrice: inputPrice.toString(),
      outputPrice: outputPrice.toString(),
      pricingMode: defaultCharacterPricing ? "CHARACTERS" : model.pricingMode,
      pricingUnit: defaultCharacterPricing ? "TEN_K_CHARACTERS" : model.pricingUnit,
      pricingConfig: model.pricingConfig,
      aliases,
      defaultPurposes: aliases.map((alias) => alias.displayName),
      supportsTts: capabilityTags.includes("TTS"),
      supportsVoiceDesign: capabilityTags.includes("VOICE_DESIGN"),
      supportsVoiceClone: capabilityTags.includes("VOICE_CLONE"),
      createdAt: model.createdAt,
      updatedAt: model.updatedAt
    };
  }

  private toVoiceConsent(consent: VoiceConsentRecord | null) {
    return consent
      ? {
          id: consent.id,
          userId: consent.userId,
          voiceAssetId: consent.voiceAssetId,
          sourceAudioAssetId: consent.sourceAudioAssetId,
          consentText: consent.consentText || consent.statement,
          consentType: consent.consentType,
          consentTypeName: voiceConsentTypeName(consent.consentType),
          ownerName: consent.ownerName,
          ownerContact: consent.ownerContact,
          agreedAt: consent.agreedAt,
          ip: consent.ip,
          userAgent: consent.userAgent,
          createdAt: consent.createdAt
        }
      : null;
  }

  private toAdminVoiceAsset(voice: AdminVoiceAssetRecord) {
    return {
      ...this.toVoiceAsset(voice),
      sourceAudioAsset: voice.sourceAudioAsset ? this.toAudioAssetMetadata(voice.sourceAudioAsset) : null,
      sourceSampleFilePath: voice.sourceAudioAssetId ? `/admin/audio/assets/${voice.sourceAudioAssetId}/file` : null,
      user: voice.user,
      consent: this.toVoiceConsent(voice.consent ?? voice.targetConsent ?? null),
      taskCount: voice._count.audioTasks,
      recentTasks: voice.audioTasks.map((task) => ({
        id: task.id,
        type: task.type,
        typeName: audioTaskTypeName(task.type),
        status: task.status,
        statusName: audioTaskStatusName(task.status),
        createdAt: task.createdAt
      })),
      recentUsageLogs: voice.audioUsageLogs.map((log) => this.toAudioUsageLog(log))
    };
  }

  private toVoiceAsset(asset: {
    id: string;
    userId: string;
    provider: string;
    providerVoiceId: string | null;
    name: string;
    type: string;
    targetModel: string;
    status: string;
    visibility: string;
    language: string | null;
    description: string | null;
    previewAudioUrl: string | null;
    sourceAudioAsset?: AudioAssetRecord | null;
    previewAudioAsset?: AudioAssetRecord | null;
    consent?: VoiceConsentRecord | null;
    targetConsent?: VoiceConsentRecord | null;
    reviewNote?: string | null;
    disabledReason?: string | null;
    reviewedAt?: Date | null;
    deletedAt?: Date | null;
    isPlatform?: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: asset.id,
      userId: asset.userId,
      provider: asset.provider,
      providerVoiceId: asset.providerVoiceId,
      name: asset.name,
      type: asset.type,
      typeName: voiceTypeName(asset.type),
      targetModel: asset.targetModel,
      status: asset.status,
      statusName: voiceStatusName(asset.status),
      visibility: asset.visibility,
      language: asset.language,
      description: asset.description,
      previewAudioUrl: asset.previewAudioUrl,
      sourceAudioAsset: asset.sourceAudioAsset ? this.toAudioAsset(asset.sourceAudioAsset) : null,
      previewAudioAsset: asset.previewAudioAsset ? this.toAudioAsset(asset.previewAudioAsset) : null,
      consent: this.toVoiceConsent(asset.consent ?? asset.targetConsent ?? null),
      reviewNote: asset.reviewNote ?? null,
      disabledReason: asset.disabledReason ?? null,
      reviewedAt: asset.reviewedAt ?? null,
      deletedAt: asset.deletedAt ?? null,
      isPlatform: asset.isPlatform ?? false,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt
    };
  }

  private toAudioTask(task: AudioTaskRecord) {
    const voiceConsent = this.toVoiceConsent(task.voiceAsset?.consent ?? null);

    return {
      id: task.id,
      userId: task.userId,
      user: task.user ?? null,
      billingContext: task.billingContext,
      organizationId: task.organizationId,
      organizationMemberId: task.organizationMemberId,
      type: task.type,
      typeName: audioTaskTypeName(task.type),
      status: task.status,
      statusName: audioTaskStatusName(task.status),
      provider: task.provider,
      model: task.model,
      providerInstanceId: task.providerInstanceId,
      modelInstanceId: task.modelInstanceId,
      voiceAssetId: task.voiceAssetId,
      inputText: task.inputText,
      inputTextLength: task.inputTextLength,
      sourceAudioAssetId: task.sourceAudioAssetId,
      outputAudioAssetId: task.outputAudioAssetId,
      estimatedCredits: task.estimatedCredits,
      actualCredits: task.actualCredits,
      errorCode: task.errorCode,
      errorMessage: task.errorMessage,
      requestId: task.requestId,
      providerPayload: task.providerPayload,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      finishedAt: task.finishedAt,
      voiceAsset: task.voiceAsset
        ? {
            ...task.voiceAsset,
            consent: voiceConsent
          }
        : null,
      voiceConsent,
      sourceAudioAsset: task.sourceAudioAsset ? this.toAudioAsset(task.sourceAudioAsset) : null,
      outputAudioAsset: task.outputAudioAsset ? this.toAudioAsset(task.outputAudioAsset) : null,
      reservation: task.reservation
        ? {
            id: task.reservation.id,
            amount: task.reservation.amount,
            status: task.reservation.status,
            statusName: reservationStatusName(task.reservation.status),
            expiresAt: task.reservation.expiresAt
          }
        : null,
      ledgerEntries: task.ledgerEntries?.map((entry) => ({
        id: entry.id,
        type: entry.type,
        typeName: ledgerTypeName(entry.type),
        amount: entry.amount,
        balanceAfter: entry.balanceAfter,
        relatedTaskId: entry.relatedTaskId,
        relatedAudioTaskId: entry.relatedAudioTaskId,
        relatedTaskType: entry.relatedTaskType,
        operationType: entry.operationType,
        operationTypeName: entry.operationType ? audioTaskTypeName(entry.operationType) : null,
        note: entry.note,
        createdAt: entry.createdAt
      })) ?? [],
      usageLogs: task.usageLogs?.map((log) => this.toAudioUsageLog(log)) ?? []
    };
  }

  private toAdminAudioTask(task: AudioTaskRecord) {
    return {
      ...this.toAudioTask(task),
      sourceAudioAsset: task.sourceAudioAsset ? this.toAudioAssetMetadata(task.sourceAudioAsset) : null,
      sourceSampleFilePath: task.sourceAudioAssetId ? `/admin/audio/assets/${task.sourceAudioAssetId}/file` : null
    };
  }

  private toAudioUsageLog(log: NonNullable<AudioTaskRecord["usageLogs"]>[number]) {
    return {
      id: log.id,
      taskId: log.taskId,
      userId: log.userId,
      provider: log.provider,
      model: log.model,
      providerInstanceId: log.providerInstanceId,
      modelInstanceId: log.modelInstanceId,
      voiceAssetId: log.voiceAssetId,
      operationType: log.operationType,
      operationTypeName: audioTaskTypeName(log.operationType),
      characterCount: log.characterCount,
      audioDurationMs: log.audioDurationMs,
      usageCount: log.usageCount,
      latencyMs: log.latencyMs,
      success: log.success,
      estimatedCost: decimalNumber(log.estimatedCost),
      consumedCredits: log.consumedCredits,
      providerRequestId: log.providerRequestId,
      createdAt: log.createdAt
    };
  }

  private toAdminOperationLog(log: {
    id: string;
    adminUserId: string | null;
    action: string;
    resourceType: string;
    resourceId: string | null;
    description: string;
    ip: string | null;
    userAgent: string | null;
    createdAt: Date;
    adminUser?: {
      id: string;
      email: string;
      name: string;
    } | null;
  }) {
    return {
      id: log.id,
      adminUserId: log.adminUserId,
      adminUser: log.adminUser ?? null,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      description: log.description,
      ip: log.ip,
      userAgent: log.userAgent,
      createdAt: log.createdAt
    };
  }

  private async listAdminOperationLogs(resourceType: string, resourceId: string) {
    const logs = await this.prisma.adminOperationLog.findMany({
      where: {
        resourceType,
        resourceId
      },
      include: {
        adminUser: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 20
    });

    return logs.map((log) => this.toAdminOperationLog(log));
  }
}

class AudioProviderException extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

interface TtsParameters {
  speed?: number;
  pitch?: number;
  volume?: number;
  format: string;
  sampleRate?: number;
}

function activeAudioModelInclude() {
  return {
    modelPreset: true,
    providerInstance: {
      include: {
        providerPreset: true,
        credential: true
      }
    }
  } satisfies Prisma.AiModelInstanceInclude;
}

function adminAudioModelInclude() {
  return {
    modelPreset: true,
    aliases: true,
    providerInstance: {
      include: {
        providerPreset: true
      }
    }
  } satisfies Prisma.AiModelInstanceInclude;
}

function adminVoiceAssetInclude() {
  return {
    user: {
      select: {
        id: true,
        email: true,
        nickname: true
      }
    },
    sourceAudioAsset: true,
    previewAudioAsset: true,
    consent: true,
    targetConsent: true,
    audioTasks: {
      orderBy: {
        createdAt: "desc"
      },
      take: 5,
      select: {
        id: true,
        type: true,
        status: true,
        createdAt: true
      }
    },
    audioUsageLogs: {
      orderBy: {
        createdAt: "desc"
      },
      take: 5
    },
    _count: {
      select: {
        audioTasks: true
      }
    }
  } satisfies Prisma.VoiceAssetInclude;
}

function audioTaskInclude() {
  return {
    voiceAsset: {
      select: {
        id: true,
        name: true,
        providerVoiceId: true,
        targetModel: true,
        status: true,
        visibility: true,
        consent: true
      }
    },
    sourceAudioAsset: true,
    outputAudioAsset: true,
    reservation: true,
    ledgerEntries: {
      orderBy: {
        createdAt: "desc"
      },
      take: 5
    },
    usageLogs: {
      orderBy: {
        createdAt: "desc"
      },
      take: 5
    }
  } satisfies Prisma.AudioTaskInclude;
}

export function localAudioStream(filepath: string) {
  return createReadStream(filepath);
}

function normalizeTtsParameters(dto: CreateTtsAudioTaskDto): TtsParameters {
  return {
    speed: clampNumber(dto.speed, 0.5, 2),
    pitch: clampNumber(dto.pitch, -500, 500),
    volume: clampNumber(dto.volume, 0, 2),
    format: audioOutputFormat(dto.format),
    sampleRate: dto.sampleRate
  };
}

function clampNumber(value: number | undefined, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return Math.min(max, Math.max(min, value));
}

function audioOutputFormat(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();

  return normalized && ["mp3", "wav", "opus"].includes(normalized) ? normalized : "mp3";
}

function extractProviderVoiceId(payload: Record<string, unknown>) {
  const direct = stringValue(payload.providerVoiceId) ?? stringValue(payload.voice_id) ?? stringValue(payload.voiceId);
  const output = typeof payload.output === "object" && payload.output ? (payload.output as Record<string, unknown>) : null;

  return direct ?? stringValue(output?.voice_id) ?? stringValue(output?.voiceId);
}

function extractAudioUrl(payload: Record<string, unknown>) {
  const direct = stringValue(payload.audioUrl) ?? stringValue(payload.previewAudioUrl);
  const output = typeof payload.output === "object" && payload.output ? (payload.output as Record<string, unknown>) : null;
  const audio = typeof output?.audio === "object" && output.audio ? (output.audio as Record<string, unknown>) : null;

  return direct ?? stringValue(output?.url) ?? stringValue(audio?.url);
}

function providerErrorMessage(error: unknown) {
  if (error instanceof AppException) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "语音任务执行失败";
}

function audioAliasName(aliasKey: string) {
  const names: Record<string, string> = {
    "tts-default": "默认语音合成模型",
    "tts-fast": "快速语音合成模型",
    "voice-clone-default": "默认声音复刻模型",
    "voice-design-default": "默认声音设计模型",
    "audio-preview": "音频预览模型"
  };

  return names[aliasKey] ?? aliasKey;
}

function isAudioModelAliasKey(value: string): value is (typeof audioModelAliases)[number] {
  return audioModelAliases.includes(value as (typeof audioModelAliases)[number]);
}

function audioAliasRequiredCapability(aliasKey: (typeof audioModelAliases)[number]) {
  const capabilities: Record<(typeof audioModelAliases)[number], AudioTaskType | null> = {
    "tts-default": "TTS",
    "tts-fast": "TTS",
    "voice-clone-default": "VOICE_CLONE",
    "voice-design-default": "VOICE_DESIGN",
    "audio-preview": null
  };

  return capabilities[aliasKey];
}

function uploadDriver() {
  const driver = (process.env.UPLOAD_DRIVER ?? "local").trim().toLowerCase();

  return driver === "s3" || driver === "s3-compatible" ? "s3" : "local";
}

function audioUploadDir() {
  return resolve(process.env.UPLOAD_DIR ?? join(process.cwd(), "uploads"), "audio");
}

function publicApiBaseUrl() {
  return (process.env.PUBLIC_API_BASE_URL ?? process.env.API_PUBLIC_BASE_URL ?? "http://localhost:7342/api").replace(/\/+$/, "");
}

function audioExtensionFor(originalName: string, mimeType: string) {
  const extension = extname(originalName).toLowerCase();

  if ([".mp3", ".wav", ".webm", ".ogg", ".aac", ".m4a", ".mp4"].includes(extension)) {
    return extension;
  }

  const byMimeType: Record<string, string> = {
    "audio/mpeg": ".mp3",
    "audio/mp3": ".mp3",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/webm": ".webm",
    "audio/ogg": ".ogg",
    "audio/aac": ".aac",
    "audio/mp4": ".m4a",
    "video/mp4": ".mp4"
  };

  return byMimeType[mimeType] ?? ".bin";
}

function mimeTypeFromAudioUrl(url: string) {
  const pathname = safePathname(url);

  if (pathname.endsWith(".wav")) {
    return "audio/wav";
  }

  if (pathname.endsWith(".webm")) {
    return "audio/webm";
  }

  if (pathname.endsWith(".ogg") || pathname.endsWith(".opus")) {
    return "audio/ogg";
  }

  return "audio/mpeg";
}

function safePathname(url: string) {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function s3Config() {
  const endpoint = requiredEnv("S3_ENDPOINT");
  const bucket = requiredEnv("S3_BUCKET");
  const region = process.env.S3_REGION || "auto";
  const accessKeyId = requiredEnv("S3_ACCESS_KEY_ID");
  const secretAccessKey = requiredEnv("S3_SECRET_ACCESS_KEY");
  const prefixInput = (process.env.S3_KEY_PREFIX ?? "uploads/").replace(/^\/+/, "");
  const prefix = `${prefixInput && !prefixInput.endsWith("/") ? `${prefixInput}/` : prefixInput}audio/`;

  return {
    endpoint,
    bucket,
    region,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl: process.env.S3_PUBLIC_BASE_URL,
    pathStyle: process.env.S3_FORCE_PATH_STYLE !== "0",
    prefix
  };
}

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new AppException(50001, `对象存储配置缺失：${name}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  return value;
}

function amzTimestamp(date: Date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function signS3Request(input: {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  method: string;
  pathname: string;
  search: string;
  headers: Record<string, string>;
  payloadHash: string;
  amzDate: string;
}) {
  const date = input.amzDate.slice(0, 8);
  const signedHeaders = Object.keys(input.headers).sort().join(";");
  const canonicalHeaders = Object.keys(input.headers)
    .sort()
    .map((key) => `${key}:${input.headers[key]}`)
    .join("\n");
  const canonicalRequest = [
    input.method,
    encodeURI(input.pathname),
    input.search.replace(/^\?/, ""),
    `${canonicalHeaders}\n`,
    signedHeaders,
    input.payloadHash
  ].join("\n");
  const credentialScope = `${date}/${input.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    input.amzDate,
    credentialScope,
    createHash("sha256").update(canonicalRequest).digest("hex")
  ].join("\n");
  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${input.secretAccessKey}`, date), input.region), "s3"),
    "aws4_request"
  );
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  return `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

function hmac(key: string | Buffer, value: string) {
  return createHmac("sha256", key).update(value).digest();
}

function defaultAudioSafetySettings() {
  return {
    audioVoiceCloneReviewRequired: true,
    audioVoiceDesignReviewRequired: false,
    audioUserPublicVoiceEnabled: false,
    audioCloneDefaultVisibility: "PRIVATE",
    audioDesignDefaultVisibility: "PRIVATE",
    audioSafetyNotice:
      "AI 生成语音可能被误用，请勿用于冒充他人、诈骗、侵权、虚假宣传或违法违规用途。声音复刻仅允许上传本人声音或已获得授权的声音。生成音频建议标注为 AI 生成语音。",
    audioCloneConsentText:
      "我确认上传的音频为本人声音，或我已获得声音权利人的明确授权。我承诺不会将该音色用于冒充他人、诈骗、侵权、虚假宣传或其他违法违规用途。",
    audioDownloadNotice: "下载或对外使用生成音频前，请确认用途合法合规，并建议标注为 AI 生成语音。"
  } as const;
}

function booleanConfig(value: string | undefined, fallback: boolean) {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return fallback;
}

function visibilityConfig(value: string | undefined, fallback: string) {
  return value === "PRIVATE" || value === "ADMIN_ONLY" || value === "PUBLIC" ? value : fallback;
}

function defaultVoiceVisibility(value: string, publicEnabled: boolean) {
  if (value === "PUBLIC" && publicEnabled) {
    return "PUBLIC";
  }

  if (value === "ADMIN_ONLY") {
    return "ADMIN_ONLY";
  }

  return "PRIVATE";
}

function moderationUpdateData(action: VoiceAssetModerationAction, reason: string | null, adminUserId: string) {
  const now = new Date();

  if (action === "APPROVE") {
    return {
      status: "READY" as const,
      reviewedByAdminId: adminUserId,
      reviewedAt: now,
      reviewNote: reason ?? "审核通过",
      disabledReason: null
    };
  }

  if (action === "REJECT") {
    return {
      status: "REJECTED" as const,
      reviewedByAdminId: adminUserId,
      reviewedAt: now,
      reviewNote: reason,
      disabledReason: reason
    };
  }

  return {
    status: "DISABLED" as const,
    reviewedByAdminId: adminUserId,
    reviewedAt: now,
    reviewNote: reason,
    disabledReason: reason
  };
}

function quoteFromAudioModelPricing(
  model: ActiveAudioModel,
  input: {
    characterCount?: number;
    audioDurationMs?: number | null;
    usageCount?: number;
  },
  creditsPerCny: number
): AudioPricingQuote | null {
  const pricingMode = normalizePricingMode(model.pricingMode);
  const pricingUnit = normalizePricingUnit(model.pricingUnit, pricingMode);
  const pricePerUnit = Math.max(0, model.inputPrice);
  let billingMode: AudioBillingMode;
  let usageCount: number;
  let unitSize: number;

  if (pricingMode === "CHARACTERS") {
    if (input.characterCount === undefined) {
      return null;
    }

    billingMode = "PER_CHARACTER";
    usageCount = Math.max(0, Math.ceil(input.characterCount ?? 0));
    unitSize = audioModelPricingUnitSize(pricingUnit);
  } else if (pricingMode === "REQUEST") {
    billingMode = "PER_TASK";
    usageCount = Math.max(1, Math.ceil(input.usageCount ?? 1));
    unitSize = 1;
  } else if (pricingMode === "SECONDS") {
    billingMode = "PER_SECOND";
    const durationSeconds = Math.ceil(Math.max(0, input.audioDurationMs ?? 0) / 1000);
    usageCount = Math.max(1, durationSeconds || Math.ceil(input.usageCount ?? 1));
    unitSize = 1;
  } else {
    return null;
  }

  const pricing = calculateModelPricingCredits({
    usageCount,
    pricePerUnit,
    unitSize,
    creditsPerCny
  });

  return {
    ruleId: `model:${model.modelInstanceId}`,
    pricingSource: "MODEL",
    billingMode,
    creditsPerUnit: 0,
    minimumCredits: pricing.minimumCredits,
    modelMultiplier: 1,
    pricingMode,
    pricingUnit,
    pricePerUnit,
    unitSize,
    creditsPerCny,
    estimatedCost: pricing.estimatedCost,
    usageCount,
    estimatedCredits: pricing.credits
  };
}

function pricingSnapshot(quote: AudioPricingQuote) {
  return {
    ruleId: quote.ruleId,
    pricingSource: quote.pricingSource,
    billingMode: quote.billingMode,
    creditsPerUnit: quote.creditsPerUnit,
    minimumCredits: quote.minimumCredits,
    modelMultiplier: quote.modelMultiplier,
    pricingMode: quote.pricingMode,
    pricingUnit: quote.pricingUnit,
    pricePerUnit: quote.pricePerUnit,
    unitSize: quote.unitSize,
    creditsPerCny: quote.creditsPerCny,
    estimatedCost: quote.estimatedCost,
    usageCount: quote.usageCount,
    estimatedCredits: quote.estimatedCredits
  };
}

function pricingSnapshotFromTask(value: Prisma.JsonValue | null): AudioPricingQuote | null {
  const root = jsonObject(value);
  const pricing = jsonObject(root?.pricing);
  const billingMode = stringValue(pricing?.billingMode);

  if (!pricing || !isBillingMode(billingMode)) {
    return null;
  }

  return {
    ruleId: stringValue(pricing.ruleId) ?? "",
    pricingSource: stringValue(pricing.pricingSource) === "MODEL" ? "MODEL" : "RULE",
    billingMode,
    creditsPerUnit: numberValue(pricing.creditsPerUnit) ?? 0,
    minimumCredits: numberValue(pricing.minimumCredits) ?? 0,
    modelMultiplier: numberValue(pricing.modelMultiplier) ?? 1,
    pricingMode: pricing.pricingMode ? normalizePricingMode(pricing.pricingMode) : undefined,
    pricingUnit: pricing.pricingUnit ? normalizePricingUnit(pricing.pricingUnit, pricing.pricingMode) : undefined,
    pricePerUnit: numberValue(pricing.pricePerUnit) ?? undefined,
    unitSize: numberValue(pricing.unitSize) ?? undefined,
    creditsPerCny: numberValue(pricing.creditsPerCny) ?? undefined,
    estimatedCost: numberValue(pricing.estimatedCost) ?? undefined,
    usageCount: numberValue(pricing.usageCount) ?? 1,
    estimatedCredits: numberValue(pricing.estimatedCredits) ?? 0
  };
}

function calculateActualCreditsFromTask(
  task: {
    type: AudioTaskType;
    inputText: string | null;
    inputTextLength: number;
    estimatedCredits: number;
    providerPayload: Prisma.JsonValue | null;
  },
  providerPayload: Record<string, unknown>
) {
  const snapshot = pricingSnapshotFromTask(task.providerPayload);

  if (!snapshot) {
    return task.estimatedCredits;
  }

  const characterCount = billableCharacterCountForTask(task, providerPayload);
  const usageCount = usageCountForPricingSnapshot(snapshot, {
    characterCount,
    audioDurationMs: extractAudioDurationMs(providerPayload),
    usageCount: snapshot.usageCount
  });

  if (snapshot.pricingSource === "MODEL") {
    return calculateModelPricingCredits({
      usageCount,
      pricePerUnit: snapshot.pricePerUnit ?? 0,
      unitSize: snapshot.unitSize ?? 1,
      creditsPerCny: snapshot.creditsPerCny ?? 100
    }).credits;
  }

  return calculatePricingCredits({
    usageCount,
    creditsPerUnit: snapshot.creditsPerUnit,
    minimumCredits: snapshot.minimumCredits,
    modelMultiplier: snapshot.modelMultiplier
  });
}

function calculatePricingCredits(input: {
  usageCount: number;
  creditsPerUnit: number;
  minimumCredits: number;
  modelMultiplier: number;
}) {
  const raw = input.usageCount * Math.max(0, input.creditsPerUnit) * Math.max(0, input.modelMultiplier);

  return Math.ceil(Math.max(input.minimumCredits, raw));
}

function calculateModelPricingCredits(input: {
  usageCount: number;
  pricePerUnit: number;
  unitSize: number;
  creditsPerCny: number;
}) {
  const safeUnitSize = Math.max(1, input.unitSize);
  const safeUsageCount = Math.max(0, input.usageCount);
  const estimatedCost = (safeUsageCount / safeUnitSize) * Math.max(0, input.pricePerUnit);
  const minimumCredits = estimatedCost > 0 ? 1 : 0;
  const credits = Math.ceil(Math.max(minimumCredits, estimatedCost * Math.max(0, input.creditsPerCny)));

  return {
    estimatedCost: Number(estimatedCost.toFixed(6)),
    minimumCredits,
    credits
  };
}

function actualEstimatedCostFromSnapshot(snapshot: AudioPricingQuote | null, usageCount: number) {
  if (snapshot?.pricingSource !== "MODEL") {
    return null;
  }

  return calculateModelPricingCredits({
    usageCount,
    pricePerUnit: snapshot.pricePerUnit ?? 0,
    unitSize: snapshot.unitSize ?? 1,
    creditsPerCny: snapshot.creditsPerCny ?? 100
  }).estimatedCost;
}

function usageCountForPricingSnapshot(
  snapshot: AudioPricingQuote,
  input: {
    characterCount?: number;
    audioDurationMs?: number | null;
    usageCount?: number;
  }
) {
  if (snapshot.pricingSource === "MODEL" && snapshot.pricingMode === "CHARACTERS") {
    return Math.max(0, Math.ceil(input.characterCount ?? 0));
  }

  if (snapshot.pricingSource === "MODEL" && snapshot.pricingMode === "SECONDS") {
    const durationSeconds = Math.ceil(Math.max(0, input.audioDurationMs ?? 0) / 1000);
    return Math.max(1, durationSeconds || Math.ceil(input.usageCount ?? 1));
  }

  return usageCountForBilling(snapshot.billingMode, input);
}

function audioModelPricingUnitSize(unit: AiModelPricingUnit) {
  if (unit === "TEN_K_CHARACTERS") {
    return 10_000;
  }

  if (unit === "K_CHARACTERS") {
    return 1_000;
  }

  return 1;
}

function usageCountForBilling(
  billingMode: AudioBillingMode | undefined,
  input: {
    characterCount?: number;
    audioDurationMs?: number | null;
    usageCount?: number;
  }
) {
  if (billingMode === "PER_CHARACTER") {
    return Math.max(1, Math.ceil(Math.max(0, input.characterCount ?? 0) / 100));
  }

  if (billingMode === "PER_SECOND") {
    return Math.max(1, Math.ceil(Math.max(0, input.audioDurationMs ?? 0) / 1000));
  }

  return Math.max(1, Math.ceil(Math.max(1, input.usageCount ?? 1)));
}

function billableCharacterCountForTask(
  task: {
    inputText: string | null;
    inputTextLength: number;
  },
  providerPayload: Record<string, unknown>
) {
  const providerCharacters = extractProviderCharacterCount(providerPayload);

  if (providerCharacters !== null) {
    return providerCharacters;
  }

  const estimatedCharacters = task.inputText ? estimatedTtsBillingCharacters(task.inputText) : 0;

  return estimatedCharacters > 0 ? estimatedCharacters : task.inputTextLength;
}

function estimatedTtsBillingCharacters(text: string) {
  let count = 0;

  for (const char of text) {
    count += (char.codePointAt(0) ?? 0) <= 0x7f ? 1 : 2;
  }

  return count;
}

function ttsGatewayTimeoutMs(text: string) {
  const billableCharacters = estimatedTtsBillingCharacters(text);
  const extraBlocks = Math.ceil(Math.max(0, billableCharacters - 400) / 500);

  return Math.min(120_000, 45_000 + extraBlocks * 15_000);
}

function extractProviderCharacterCount(payload: Record<string, unknown>) {
  const usage = jsonObject(payload.usage);
  const providerUsage = jsonObject(payload.providerUsage) ?? jsonObject(usage?.providerUsage);
  const raw = jsonObject(payload.raw);
  const rawUsage = jsonObject(raw?.usage);
  const output = jsonObject(payload.output);
  const outputUsage = jsonObject(output?.usage);
  const candidates = [
    providerUsage?.characters,
    providerUsage?.characterCount,
    usage?.characters,
    usage?.characterCount,
    usage?.inputCharacters,
    usage?.totalCharacters,
    rawUsage?.characters,
    rawUsage?.characterCount,
    outputUsage?.characters,
    outputUsage?.characterCount,
    payload.characters,
    payload.characterCount
  ];

  for (const candidate of candidates) {
    const value = numberValue(candidate);

    if (value !== null && value >= 0) {
      return Math.ceil(value);
    }
  }

  return null;
}

function parseCreditsPerCny(value: string | null | undefined) {
  const fallback = 100;
  const normalized = value?.trim();

  if (!normalized) {
    return fallback;
  }

  const numbers = normalized.match(/\d+(?:\.\d+)?/g)?.map(Number).filter((item) => Number.isFinite(item) && item > 0) ?? [];

  if (numbers.length >= 2) {
    return numbers[1] / numbers[0];
  }

  return numbers[0] ?? fallback;
}

function mergeProviderPayload(existing: Prisma.JsonValue | null, providerPayload: Record<string, unknown>) {
  const existingObject = jsonObject(existing) ?? {};

  return {
    ...existingObject,
    ...providerPayload,
    pricing: existingObject.pricing ?? providerPayload.pricing
  };
}

function extractProviderRequestId(payload: Record<string, unknown>) {
  return stringValue(payload.requestId) ?? stringValue(payload.request_id);
}

function extractLatencyMs(payload: Record<string, unknown>) {
  return numberValue(payload.latencyMs) ?? numberValue(payload.latency_ms) ?? null;
}

function extractAudioDurationMs(payload: Record<string, unknown>) {
  const output = jsonObject(payload.output);
  const audio = jsonObject(output?.audio);
  const usage = jsonObject(payload.usage);
  const seconds =
    numberValue(payload.audioDurationSeconds) ??
    numberValue(audio?.durationSeconds) ??
    numberValue(usage?.durationSeconds);

  return (
    numberValue(payload.audioDurationMs) ??
    numberValue(payload.durationMs) ??
    numberValue(audio?.durationMs) ??
    numberValue(usage?.audioDurationMs) ??
    (seconds ? Math.round(seconds * 1000) : null)
  );
}

function estimatedAudioCost(payload: Record<string, unknown>) {
  return numberValue(payload.estimatedCost) ?? numberValue(payload.providerCost) ?? 0;
}

function jsonObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function applySystemVoiceOverride(voice: (typeof systemVoices)[number], override?: SystemVoiceOverride) {
  return {
    ...voice,
    name: override?.name ?? voice.name,
    description: override?.description ?? voice.description,
    trait: override?.trait ?? voice.trait,
    scene: override?.scene ?? voice.scene,
    ageCategory: override?.ageCategory ?? voice.ageCategory,
    status: override?.status ?? voice.status,
    disabledReason: override?.disabledReason ?? null,
    isCustomized: Boolean(override),
    updatedAt: override?.updatedAt ?? null
  };
}

function normalizeSystemVoiceOverride(value: Record<string, unknown>): SystemVoiceOverride | null {
  const status = value.status === "DISABLED" ? "DISABLED" : value.status === "READY" ? "READY" : undefined;
  const ageCategory = isSystemVoiceAgeCategory(value.ageCategory) ? value.ageCategory : undefined;
  const override: SystemVoiceOverride = {};

  if (typeof value.name === "string" && value.name.trim()) {
    override.name = value.name.trim().slice(0, 80);
  }

  if (typeof value.description === "string" && value.description.trim()) {
    override.description = value.description.trim().slice(0, 300);
  }

  if (typeof value.trait === "string" && value.trait.trim()) {
    override.trait = value.trait.trim().slice(0, 120);
  }

  if (typeof value.scene === "string" && value.scene.trim()) {
    override.scene = value.scene.trim().slice(0, 120);
  }

  if (ageCategory) {
    override.ageCategory = ageCategory;
  }

  if (status) {
    override.status = status;
  }

  if (typeof value.disabledReason === "string") {
    override.disabledReason = value.disabledReason.trim().slice(0, 300) || null;
  }

  if (typeof value.updatedAt === "string") {
    override.updatedAt = value.updatedAt;
  }

  return Object.keys(override).length > 0 ? override : null;
}

function isSystemVoiceAgeCategory(value: unknown): value is "儿童" | "青年" | "中年" | "老年" {
  return value === "儿童" || value === "青年" || value === "中年" || value === "老年";
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function decimalNumber(value: DecimalLike | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = Number(typeof value === "number" ? value : value.toString());

  return Number.isFinite(parsed) ? parsed : 0;
}

function isBillingMode(value: string | null): value is AudioBillingMode {
  return value === "PER_CHARACTER" || value === "PER_TASK" || value === "PER_SECOND";
}

function isAudioTaskType(value: string | undefined): value is AudioTaskType {
  return value === "TTS" || value === "VOICE_CLONE" || value === "VOICE_DESIGN";
}

function isAudioTaskStatus(value: string | undefined): value is AudioTaskStatus {
  return (
    value === "CREATED" ||
    value === "RESERVED" ||
    value === "UPLOADING" ||
    value === "PROCESSING" ||
    value === "SUCCEEDED" ||
    value === "FAILED" ||
    value === "CANCELLED" ||
    value === "COMPENSATED"
  );
}

function adminAudioTaskDateFilter(startTime: string | undefined, endTime: string | undefined) {
  const range: Prisma.DateTimeFilter = {};
  const startAt = parseAdminAudioListDate(startTime);
  const endAt = parseAdminAudioListDate(endTime);

  if (startAt) {
    range.gte = startAt;
  }

  if (endAt) {
    range.lte = endAt;
  }

  return Object.keys(range).length > 0 ? range : null;
}

function parseAdminAudioListDate(value: string | undefined) {
  const normalized = emptyToNull(value);

  if (!normalized) {
    return null;
  }

  const date = new Date(normalized);

  return Number.isNaN(date.getTime()) ? null : date;
}

function parseAdminAudioListPage(value: string | undefined) {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function parseAdminAudioListPageSize(value: string | undefined, fallback: number) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, 200);
}

interface AudioDateRange {
  from: string;
  to: string;
  startAt: Date;
  endAt: Date;
  keys: string[];
}

const audioShanghaiOffsetMs = 8 * 60 * 60 * 1000;

function normalizeAudioDateRange(
  filters: {
    from?: string;
    to?: string;
  },
  defaultDays: number
): AudioDateRange {
  const today = audioDateKeyInShanghai(new Date());
  const to = normalizeAudioDateKey(filters.to) ?? today;
  const from = normalizeAudioDateKey(filters.from) ?? addAudioDays(to, -(defaultDays - 1));
  const orderedFrom = from <= to ? from : to;
  const orderedTo = from <= to ? to : from;
  const keys: string[] = [];
  let cursor = orderedFrom;

  while (cursor <= orderedTo && keys.length < 366) {
    keys.push(cursor);
    cursor = addAudioDays(cursor, 1);
  }

  return {
    from: orderedFrom,
    to: orderedTo,
    startAt: audioShanghaiStart(orderedFrom),
    endAt: audioShanghaiStart(addAudioDays(orderedTo, 1)),
    keys
  };
}

function audioDateKeyInShanghai(date: Date) {
  const shifted = new Date(date.getTime() + audioShanghaiOffsetMs);

  return shifted.toISOString().slice(0, 10);
}

function normalizeAudioDateKey(value: string | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  const parsed = new Date(normalized);

  return Number.isNaN(parsed.getTime()) ? null : audioDateKeyInShanghai(parsed);
}

function audioShanghaiStart(key: string) {
  const [year, month, day] = key.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day) - audioShanghaiOffsetMs);
}

function addAudioDays(key: string, days: number) {
  const [year, month, day] = key.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));

  return next.toISOString().slice(0, 10);
}

function summarizeAudioUsage(
  rows: Array<{
    operationType: AudioTaskType;
    characterCount: number;
    audioDurationMs: number | null;
    success: boolean;
    consumedCredits: number;
    estimatedCost: DecimalLike;
    latencyMs: number | null;
  }>
) {
  const total = rows.reduce(
    (acc, row) => {
      acc.requestCount += 1;
      acc.successCount += row.success ? 1 : 0;
      acc.failureCount += row.success ? 0 : 1;
      acc.ttsCount += row.operationType === "TTS" ? 1 : 0;
      acc.voiceCloneCount += row.operationType === "VOICE_CLONE" ? 1 : 0;
      acc.voiceDesignCount += row.operationType === "VOICE_DESIGN" ? 1 : 0;
      acc.characterCount += row.characterCount;
      acc.audioDurationMs += row.audioDurationMs ?? 0;
      acc.consumedCredits += row.consumedCredits;
      acc.estimatedCost += decimalNumber(row.estimatedCost);

      if (row.latencyMs && row.latencyMs > 0) {
        acc.latencyTotal += row.latencyMs;
        acc.latencyCount += 1;
      }

      return acc;
    },
    {
      requestCount: 0,
      successCount: 0,
      failureCount: 0,
      ttsCount: 0,
      voiceCloneCount: 0,
      voiceDesignCount: 0,
      characterCount: 0,
      audioDurationMs: 0,
      consumedCredits: 0,
      estimatedCost: 0,
      latencyTotal: 0,
      latencyCount: 0
    }
  );

  return {
    requestCount: total.requestCount,
    successCount: total.successCount,
    failureCount: total.failureCount,
    failureRate: total.requestCount > 0 ? (total.failureCount / total.requestCount) * 100 : 0,
    ttsCount: total.ttsCount,
    voiceCloneCount: total.voiceCloneCount,
    voiceDesignCount: total.voiceDesignCount,
    characterCount: total.characterCount,
    audioDurationMs: total.audioDurationMs,
    consumedCredits: total.consumedCredits,
    estimatedCost: Number(total.estimatedCost.toFixed(4)),
    avgLatencyMs: total.latencyCount > 0 ? Math.round(total.latencyTotal / total.latencyCount) : 0
  };
}

function groupAudioUsage<TRow extends Parameters<typeof summarizeAudioUsage>[0][number]>(
  rows: TRow[],
  idFor: (row: TRow) => string,
  nameFor: (id: string, rows: TRow[]) => string
) {
  const groups = new Map<string, TRow[]>();

  for (const row of rows) {
    const id = idFor(row);
    groups.set(id, [...(groups.get(id) ?? []), row]);
  }

  return Array.from(groups.entries())
    .map(([id, groupRows]) => ({
      id,
      name: nameFor(id, groupRows),
      ...summarizeAudioUsage(groupRows)
    }))
    .sort((first, second) => second.requestCount - first.requestCount);
}

function maxAudioUploadBytes() {
  const value = Number(process.env.AUDIO_UPLOAD_MAX_BYTES ?? 20 * 1024 * 1024);

  return Number.isFinite(value) && value > 0 ? value : 20 * 1024 * 1024;
}

function gatewayBaseUrl() {
  return (process.env.AI_GATEWAY_BASE_URL ?? "http://127.0.0.1:7343").replace(/\/+$/, "");
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function normalizeOptionalBaseUrl(value: string | undefined) {
  if (value === undefined) {
    return undefined;
  }

  const normalized = emptyToNull(value);

  return normalized ? normalizeBaseUrl(normalized) : null;
}

function maskSecretPreview(encrypted: string) {
  try {
    return maskSecret(decryptSecret(encrypted));
  } catch {
    return "已配置";
  }
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

function normalizeCapabilityTags(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim().toUpperCase())
        .filter((value) => value.length > 0)
        .slice(0, 20)
    )
  );
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function audioAssetTypeName(type: string) {
  const names: Record<string, string> = {
    SOURCE_SAMPLE: "声音样本",
    PREVIEW: "试听预览",
    TTS_OUTPUT: "语音合成结果"
  };

  return names[type] ?? type;
}

function audioTaskTypeName(type: string) {
  const names: Record<string, string> = {
    TTS: "语音合成",
    VOICE_CLONE: "声音复刻",
    VOICE_DESIGN: "声音设计"
  };

  return names[type] ?? type;
}

function audioEnterpriseFeatureCode(type: AudioTaskType) {
  const names: Record<AudioTaskType, string> = {
    TTS: "audio.tts",
    VOICE_CLONE: "audio.voice_clone",
    VOICE_DESIGN: "audio.voice_design"
  };

  return names[type];
}

function voiceConsentTypeName(type: string) {
  const names: Record<string, string> = {
    SELF_VOICE: "本人声音",
    AUTHORIZED_VOICE: "已获授权声音"
  };

  return names[type] ?? type;
}

function audioTaskStatusName(status: string) {
  const names: Record<string, string> = {
    CREATED: "已创建",
    RESERVED: "已冻结点数",
    UPLOADING: "上传中",
    PROCESSING: "处理中",
    SUCCEEDED: "处理成功",
    FAILED: "处理失败",
    CANCELLED: "已取消",
    COMPENSATED: "已补偿"
  };

  return names[status] ?? status;
}

function reservationStatusName(status: string) {
  const names: Record<string, string> = {
    RESERVED: "已冻结",
    SETTLED: "已结算",
    RELEASED: "已释放",
    EXPIRED: "已过期",
    FAILED: "冻结失败"
  };

  return names[status] ?? status;
}

function ledgerTypeName(type: string) {
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

function voiceTypeName(type: string) {
  const names: Record<string, string> = {
    SYSTEM: "系统音色",
    CLONED: "复刻音色",
    DESIGNED: "设计音色"
  };

  return names[type] ?? type;
}

function voiceStatusName(status: string) {
  const names: Record<string, string> = {
    DRAFT: "草稿",
    CREATING: "创建中",
    PENDING_REVIEW: "待审核",
    READY: "可用",
    FAILED: "创建失败",
    REJECTED: "审核拒绝",
    DISABLED: "已禁用",
    DELETED: "已删除"
  };

  return names[status] ?? status;
}
