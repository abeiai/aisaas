import type { PrismaClient } from "../generated/client/index.js";
import { aiPresetVersion, defaultModelAliases, providerPresets } from "./ai-preset-data.js";

type PrismaLike = PrismaClient;

export async function seedAiPresets(prisma: PrismaLike) {
  let providerCount = 0;
  let modelCount = 0;

  for (const preset of providerPresets) {
    const provider = await prisma.aiProviderPreset.upsert({
      where: {
        providerKey: preset.providerKey
      },
      update: {
        displayName: preset.displayName,
        adapterType: preset.adapterType,
        defaultBaseUrl: preset.defaultBaseUrl,
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
        defaultBaseUrl: preset.defaultBaseUrl,
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

    await prisma.aiProviderInstance.upsert({
      where: {
        id: await providerInstanceId(prisma, provider.id)
      },
      update: {},
      create: {
        providerPresetId: provider.id,
        name: provider.displayName,
        baseUrl: provider.defaultBaseUrl,
        status: "DISABLED"
      }
    });

    for (const modelPreset of preset.models) {
      await prisma.aiModelPreset.upsert({
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
          recommendedAlias: modelPreset.recommendedAlias ?? null
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
          recommendedAlias: modelPreset.recommendedAlias ?? null
        }
      });
      modelCount += 1;
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
