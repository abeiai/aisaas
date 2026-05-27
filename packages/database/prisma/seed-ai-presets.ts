import type { PrismaClient } from "../generated/client/index.js";
import { aiPresetVersion, defaultModelAliases, providerPresets } from "./ai-preset-data.js";

type PrismaLike = PrismaClient;

export async function seedAiPresets(prisma: PrismaLike) {
  let providerCount = 0;
  let modelCount = 0;

  for (const preset of providerPresets) {
    const modality = "modality" in preset ? preset.modality : "TEXT";
    const defaultWebSocketUrl = "defaultWebSocketUrl" in preset ? preset.defaultWebSocketUrl : null;
    const provider = await prisma.aiProviderPreset.upsert({
      where: {
        providerKey: preset.providerKey
      },
      update: {
        displayName: preset.displayName,
        adapterType: preset.adapterType,
        modality,
        defaultBaseUrl: preset.defaultBaseUrl,
        defaultWebSocketUrl,
        apiKeyEnvName: preset.apiKeyEnvName,
        docsUrl: preset.docsUrl || null,
        region: preset.region,
        isBuiltIn: true,
        isEnabledByDefault: false,
        presetVersion: aiPresetVersion,
        lastUpdatedAt: new Date()
      },
      create: {
        providerKey: preset.providerKey,
        displayName: preset.displayName,
        adapterType: preset.adapterType,
        modality,
        defaultBaseUrl: preset.defaultBaseUrl,
        defaultWebSocketUrl,
        apiKeyEnvName: preset.apiKeyEnvName,
        docsUrl: preset.docsUrl || null,
        region: preset.region,
        isBuiltIn: true,
        isEnabledByDefault: false,
        presetVersion: aiPresetVersion,
        lastUpdatedAt: new Date()
      }
    });
    providerCount += 1;

    const providerInstance = await prisma.aiProviderInstance.upsert({
      where: {
        id: await providerInstanceId(prisma, provider.id)
      },
      update: {},
      create: {
        providerPresetId: provider.id,
        name: provider.displayName,
        baseUrl: provider.defaultBaseUrl,
        webSocketUrl: provider.defaultWebSocketUrl,
        region: provider.region?.split(",")[0] ?? null,
        status: "DISABLED"
      }
    });

    for (const modelPreset of preset.models) {
      const pricingConfig = modelPresetPricingConfig(modelPreset);
      const savedModelPreset = await prisma.aiModelPreset.upsert({
        where: {
          providerPresetId_modelKey: {
            providerPresetId: provider.id,
            modelKey: modelPreset.modelKey
          }
        },
        update: {
          displayName: modelPreset.displayName,
          providerModelName: modelPreset.providerModelName,
          capabilityTags: [...modelPreset.capabilityTags],
          contextWindow: modelPreset.contextWindow ?? null,
          supportsStreaming: modelPreset.supportsStreaming ?? false,
          supportsVision: modelPreset.supportsVision ?? false,
          supportsTools: modelPreset.supportsTools ?? false,
          supportsEmbedding: modelPreset.supportsEmbedding ?? false,
          supportsImageGeneration: modelPreset.supportsImageGeneration ?? false,
          supportsAudio: modelPreset.supportsAudio ?? false,
          recommendedAlias: modelPreset.recommendedAlias ?? null,
          pricingConfig
        },
        create: {
          providerPresetId: provider.id,
          modelKey: modelPreset.modelKey,
          displayName: modelPreset.displayName,
          providerModelName: modelPreset.providerModelName,
          capabilityTags: [...modelPreset.capabilityTags],
          contextWindow: modelPreset.contextWindow ?? null,
          supportsStreaming: modelPreset.supportsStreaming ?? false,
          supportsVision: modelPreset.supportsVision ?? false,
          supportsTools: modelPreset.supportsTools ?? false,
          supportsEmbedding: modelPreset.supportsEmbedding ?? false,
          supportsImageGeneration: modelPreset.supportsImageGeneration ?? false,
          supportsAudio: modelPreset.supportsAudio ?? false,
          recommendedAlias: modelPreset.recommendedAlias ?? null,
          pricingConfig
        }
      });
      if (pricingConfig) {
        const summary = pricingSummaryFromPresetConfig(pricingConfig);

        await prisma.aiModelInstance.updateMany({
          where: {
            modelPresetId: savedModelPreset.id
          },
          data: {
            pricingConfig,
            inputPrice: summary.inputPrice,
            outputPrice: summary.outputPrice,
            pricingMode: summary.pricingMode,
            pricingUnit: summary.pricingUnit
          }
        });
      }
      modelCount += 1;
    }

    if (preset.providerKey === "aliyun_dashscope_audio") {
      await seedDashScopeAudioDefaults(prisma, provider.id, providerInstance.id);
    }

    if (preset.providerKey === "dashscope") {
      await seedDashScopeImageDefaults(prisma, provider.id, providerInstance.id);
      await seedDashScopeVideoDefaults(prisma, provider.id, providerInstance.id);
    }
  }

  for (const alias of defaultModelAliases) {
    await prisma.aiModelAlias.upsert({
      where: {
        aliasKey: alias.aliasKey
      },
      update: {
        displayName: alias.displayName,
        description: alias.description
      },
      create: {
        aliasKey: alias.aliasKey,
        displayName: alias.displayName,
        description: alias.description
      }
    });
  }

  const copywriting = await prisma.aiScenario.findUnique({
    where: {
      slug: "copywriting"
    },
    select: {
      id: true,
      requiredCapabilities: true
    }
  });

  if (copywriting) {
    if (!copywriting.requiredCapabilities) {
      await prisma.aiScenario.update({
        where: {
          id: copywriting.id
        },
        data: {
          requiredCapabilities: ["TEXT"]
        }
      });
    }
    await prisma.aiScenarioModelBinding.upsert({
      where: {
        scenarioId: copywriting.id
      },
      update: {},
      create: {
        scenarioId: copywriting.id,
        defaultModelAlias: "default-chat",
        fallbackModelAlias: "fast-chat"
      }
    });
  }

  return {
    providerCount,
    modelCount,
    aliasCount: defaultModelAliases.length,
    scenarioBinding: Boolean(copywriting)
  };
}

async function providerInstanceId(prisma: PrismaLike, providerPresetId: string) {
  const existing = await prisma.aiProviderInstance.findFirst({
    where: {
      providerPresetId
    },
    select: {
      id: true
    }
  });

  return existing?.id ?? "__create_new_provider_instance__";
}

const audioRecommendedAliasKeys = [
  "tts-default",
  "tts-fast",
  "voice-clone-default",
  "voice-design-default",
  "audio-preview"
] as const;

const imageRecommendedAliasKeys = ["image-generation"] as const;
const videoRecommendedAliasKeys = ["video-generation"] as const;

async function seedDashScopeAudioDefaults(prisma: PrismaLike, providerPresetId: string, providerInstanceId: string) {
  const providerInstance = await prisma.aiProviderInstance.findUnique({
    where: {
      id: providerInstanceId
    },
    select: {
      baseUrl: true,
      webSocketUrl: true,
      region: true
    }
  });
  const modelPresets = await prisma.aiModelPreset.findMany({
    where: {
      providerPresetId,
      recommendedAlias: {
        in: [...audioRecommendedAliasKeys]
      }
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  for (const modelPreset of modelPresets) {
    if (!modelPreset.recommendedAlias || !isAudioRecommendedAliasKey(modelPreset.recommendedAlias)) {
      continue;
    }

    const capabilityTags = jsonStringArray(modelPreset.capabilityTags);
    const requiredCapability = audioRecommendedAliasCapability(modelPreset.recommendedAlias);
    if (requiredCapability && !capabilityTags.includes(requiredCapability)) {
      continue;
    }

    const model = await prisma.aiModelInstance.upsert({
      where: {
        providerInstanceId_providerModelName: {
          providerInstanceId,
          providerModelName: modelPreset.providerModelName
        }
      },
      update: {
        displayName: modelPreset.displayName,
        capabilityTags,
        modelPresetId: modelPreset.id
      },
      create: {
        providerInstanceId,
        modelPresetId: modelPreset.id,
        displayName: modelPreset.displayName,
        providerModelName: modelPreset.providerModelName,
        baseUrl: providerInstance?.baseUrl,
        webSocketUrl: providerInstance?.webSocketUrl,
        region: providerInstance?.region,
        capabilityTags,
        inputPrice: capabilityTags.includes("TTS") ? "1" : "0",
        outputPrice: "0",
        pricingMode: "CHARACTERS",
        pricingUnit: "TEN_K_CHARACTERS",
        isEnabled: true
      }
    });

    if (model.isEnabled) {
      await bindRecommendedAudioAlias(prisma, modelPreset.recommendedAlias, model.id);
    }
  }
}

async function bindRecommendedAudioAlias(
  prisma: PrismaLike,
  aliasKey: (typeof audioRecommendedAliasKeys)[number],
  modelInstanceId: string
) {
  const alias = await prisma.aiModelAlias.findUnique({
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

  await prisma.aiModelAlias.upsert({
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

async function seedDashScopeImageDefaults(prisma: PrismaLike, providerPresetId: string, providerInstanceId: string) {
  const providerInstance = await prisma.aiProviderInstance.findUnique({
    where: {
      id: providerInstanceId
    },
    select: {
      baseUrl: true,
      webSocketUrl: true,
      region: true
    }
  });
  const modelPresets = await prisma.aiModelPreset.findMany({
    where: {
      providerPresetId,
      recommendedAlias: {
        in: [...imageRecommendedAliasKeys]
      }
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  const sortedPresets = [...modelPresets].sort((left, right) => imageModelPriority(left.providerModelName) - imageModelPriority(right.providerModelName));

  for (const modelPreset of sortedPresets) {
    if (!modelPreset.recommendedAlias || !isImageRecommendedAliasKey(modelPreset.recommendedAlias)) {
      continue;
    }

    const capabilityTags = jsonStringArray(modelPreset.capabilityTags);
    if (!capabilityTags.includes("IMAGE_GENERATION")) {
      continue;
    }

    const model = await prisma.aiModelInstance.upsert({
      where: {
        providerInstanceId_providerModelName: {
          providerInstanceId,
          providerModelName: modelPreset.providerModelName
        }
      },
      update: {
        displayName: modelPreset.displayName,
        capabilityTags,
        modelPresetId: modelPreset.id
      },
      create: {
        providerInstanceId,
        modelPresetId: modelPreset.id,
        displayName: modelPreset.displayName,
        providerModelName: modelPreset.providerModelName,
        baseUrl: providerInstance?.baseUrl,
        webSocketUrl: providerInstance?.webSocketUrl,
        region: providerInstance?.region,
        capabilityTags,
        inputPrice: "0",
        outputPrice: "0",
        isEnabled: true
      }
    });

    if (model.isEnabled) {
      await bindRecommendedImageAlias(prisma, modelPreset.recommendedAlias, model.id);
    }
  }
}

async function bindRecommendedImageAlias(
  prisma: PrismaLike,
  aliasKey: (typeof imageRecommendedAliasKeys)[number],
  modelInstanceId: string
) {
  const alias = await prisma.aiModelAlias.findUnique({
    where: {
      aliasKey
    },
    select: {
      displayName: true,
      description: true,
      modelInstanceId: true
    }
  });

  if (alias?.modelInstanceId) {
    return;
  }

  await prisma.aiModelAlias.upsert({
    where: {
      aliasKey
    },
    update: {
      displayName: alias?.displayName ?? "图片生成模型",
      description: alias?.description ?? "图片生成或视觉创意产出。",
      modelInstanceId
    },
    create: {
      aliasKey,
      displayName: "图片生成模型",
      description: "图片生成或视觉创意产出。",
      modelInstanceId
    }
  });
}

function isImageRecommendedAliasKey(value: string): value is (typeof imageRecommendedAliasKeys)[number] {
  return imageRecommendedAliasKeys.includes(value as (typeof imageRecommendedAliasKeys)[number]);
}

function imageModelPriority(modelName: string) {
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

async function seedDashScopeVideoDefaults(prisma: PrismaLike, providerPresetId: string, providerInstanceId: string) {
  const providerInstance = await prisma.aiProviderInstance.findUnique({
    where: {
      id: providerInstanceId
    },
    select: {
      baseUrl: true,
      webSocketUrl: true,
      region: true
    }
  });
  const modelPresets = await prisma.aiModelPreset.findMany({
    where: {
      providerPresetId,
      recommendedAlias: {
        in: [...videoRecommendedAliasKeys]
      }
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  const sortedPresets = [...modelPresets].sort((left, right) => videoModelPriority(left.providerModelName) - videoModelPriority(right.providerModelName));

  for (const modelPreset of sortedPresets) {
    if (!modelPreset.recommendedAlias || !isVideoRecommendedAliasKey(modelPreset.recommendedAlias)) {
      continue;
    }

    const capabilityTags = jsonStringArray(modelPreset.capabilityTags);
    if (!capabilityTags.includes("VIDEO_GENERATION")) {
      continue;
    }

    const model = await prisma.aiModelInstance.upsert({
      where: {
        providerInstanceId_providerModelName: {
          providerInstanceId,
          providerModelName: modelPreset.providerModelName
        }
      },
      update: {
        displayName: modelPreset.displayName,
        capabilityTags,
        modelPresetId: modelPreset.id
      },
      create: {
        providerInstanceId,
        modelPresetId: modelPreset.id,
        displayName: modelPreset.displayName,
        providerModelName: modelPreset.providerModelName,
        baseUrl: providerInstance?.baseUrl,
        webSocketUrl: providerInstance?.webSocketUrl,
        region: providerInstance?.region,
        capabilityTags,
        inputPrice: "0",
        outputPrice: "0",
        pricingMode: "VIDEO_SECONDS",
        pricingUnit: "SECOND",
        isEnabled: true
      }
    });

    if (model.isEnabled) {
      await bindRecommendedVideoAlias(prisma, modelPreset.recommendedAlias, model.id);
    }
  }
}

async function bindRecommendedVideoAlias(
  prisma: PrismaLike,
  aliasKey: (typeof videoRecommendedAliasKeys)[number],
  modelInstanceId: string
) {
  const alias = await prisma.aiModelAlias.findUnique({
    where: {
      aliasKey
    },
    select: {
      displayName: true,
      description: true,
      modelInstanceId: true
    }
  });

  if (alias?.modelInstanceId) {
    return;
  }

  await prisma.aiModelAlias.upsert({
    where: {
      aliasKey
    },
    update: {
      displayName: alias?.displayName ?? "视频生成模型",
      description: alias?.description ?? "体验区视频生成、图生视频、参考生视频和视频编辑使用。",
      modelInstanceId
    },
    create: {
      aliasKey,
      displayName: "视频生成模型",
      description: "体验区视频生成、图生视频、参考生视频和视频编辑使用。",
      modelInstanceId
    }
  });
}

function isVideoRecommendedAliasKey(value: string): value is (typeof videoRecommendedAliasKeys)[number] {
  return videoRecommendedAliasKeys.includes(value as (typeof videoRecommendedAliasKeys)[number]);
}

function videoModelPriority(modelName: string) {
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

function jsonStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function modelPresetPricingConfig(modelPreset: (typeof providerPresets)[number]["models"][number]) {
  return "pricingConfig" in modelPreset ? modelPreset.pricingConfig : null;
}

function pricingSummaryFromPresetConfig(config: NonNullable<ReturnType<typeof modelPresetPricingConfig>>) {
  if (config.mode === "TOKEN_CACHE") {
    return {
      inputPrice: String(config.inputCacheMiss),
      outputPrice: String(config.output),
      pricingMode: "TOKEN_CACHE",
      pricingUnit: "M_TOKENS"
    };
  }

  if (config.mode === "TOKEN_TIERED") {
    const firstTier = config.tiers[0];

    return {
      inputPrice: String(firstTier?.input ?? 0),
      outputPrice: String(firstTier?.output ?? 0),
      pricingMode: "TOKEN_TIERED",
      pricingUnit: "M_TOKENS"
    };
  }

  return {
    inputPrice: String("input" in config ? config.input : 0),
    outputPrice: String("output" in config ? config.output : 0),
    pricingMode: "TOKENS",
    pricingUnit: "unit" in config ? config.unit : "K_TOKENS"
  };
}
