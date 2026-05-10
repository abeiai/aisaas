import { HttpStatus, Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
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
import { CreateAiTaskDto } from "./dto/create-ai-task.dto.js";
import { getProviderAdapter, ProviderAdapterException, type ProviderAdapterType } from "./provider-adapters.js";

type AiTaskStatus =
  | "CREATED"
  | "RESERVED"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "COMPENSATED";

type CreditReservationStatus = "RESERVED" | "SETTLED" | "RELEASED" | "EXPIRED" | "FAILED";

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

export type ToolInputFieldType = "text" | "textarea" | "select" | "number" | "switch";

export interface ToolInputField {
  name: string;
  label: string;
  type: ToolInputFieldType;
  required: boolean;
  placeholder: string;
  options: string[];
  min?: number;
  max?: number;
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
    const activeModel = await this.getModelForScenario(scenario);
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
        activeModel
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
    const activeModel = await this.getModelForScenario(scenario);
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
        signal
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

    const apiKey = dto.apiKey?.trim();
    const instance = preset.instances[0]
      ? await this.prisma.aiProviderInstance.update({
          where: {
            id: preset.instances[0].id
          },
          data: {
            name: dto.name?.trim(),
            baseUrl: dto.baseUrl === undefined ? undefined : normalizeBaseUrl(dto.baseUrl),
            status: dto.status
          }
        })
      : await this.prisma.aiProviderInstance.create({
          data: {
            providerPresetId: preset.id,
            name: dto.name?.trim() || preset.displayName,
            baseUrl: normalizeBaseUrl(dto.baseUrl || preset.defaultBaseUrl),
            status: dto.status ?? "DISABLED"
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
          status: "DISABLED"
        }
      }));

    const capabilityTags = normalizeCapabilityTags(
      dto.capabilityTags ?? jsonStringArray(modelPreset.capabilityTags)
    );

    await this.prisma.aiModelInstance.upsert({
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
              },
              take: 1
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

    if (!instance.credential) {
      const result = {
        success: false,
        message: "尚未配置 API Key"
      };
      await this.saveProviderTestResult(instance.id, result, "TEST_FAILED");
      return result;
    }

    const modelName = instance.modelInstances[0]?.providerModelName;

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
      apiKeyEncrypted: instance.credential.apiKeyEncrypted,
      modelName,
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
      const rawValue = field.name === "input" ? input : normalized[field.name] ?? "";
      const value = String(rawValue ?? "").trim();

      if (field.required && !value) {
        throw new AppException(40001, `请填写${field.label}`, HttpStatus.BAD_REQUEST);
      }

      if (!value && field.type !== "switch") {
        continue;
      }

      if (field.type === "number") {
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

      if (field.type === "select" && value && field.options.length > 0 && !field.options.includes(value)) {
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

      if (!["text", "textarea", "select", "number", "switch"].includes(type)) {
        if (strict) {
          throw new AppException(40001, "输入字段 type 只支持 text、textarea、select、number、switch", HttpStatus.BAD_REQUEST);
        }

        continue;
      }

      const options = Array.isArray(record.options)
        ? record.options.map((option) => String(option ?? "").trim()).filter(Boolean).slice(0, 20)
        : [];

      if (type === "select" && options.length === 0) {
        if (strict) {
          throw new AppException(40001, `${label} 的 select 选项不能为空`, HttpStatus.BAD_REQUEST);
        }

        continue;
      }

      const min = optionalNumber(record.min);
      const max = optionalNumber(record.max);

      if (min !== undefined && max !== undefined && min > max) {
        if (strict) {
          throw new AppException(40001, `${label} 的最小值不能大于最大值`, HttpStatus.BAD_REQUEST);
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
        options,
        min,
        max
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

  private async streamGenerateText(
    input: string,
    prompt: string,
    scenario: AiScenarioRecord,
    taskId: string,
    activeModel: ActiveAiModel | null,
    onEvent: (event: Record<string, unknown>) => void,
    signal?: AbortSignal
  ): Promise<ProviderResult> {
    if (activeModel) {
      const adapter = getProviderAdapter(activeModel.adapterType);

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
          signal,
          onDelta: (text) => {
            onEvent({
              type: "delta",
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
    activeModel: ActiveAiModel | null
  ): Promise<ProviderResult> {
    try {
      return await this.generateText(input, prompt, scenario, taskId, activeModel);
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

          return this.generateText(input, prompt, scenario, taskId, fallbackModel);
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

      return this.generateText(input, prompt, scenario, taskId, fallbackModel);
    }
  }

  private async generateText(
    input: string,
    prompt: string,
    scenario: AiScenarioRecord,
    taskId: string,
    activeModel: ActiveAiModel | null
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
        timeoutMs: aiGatewayTimeoutMs()
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

    const promptPreview = prompt && prompt !== input ? `\n\n已渲染 Prompt：${prompt.slice(0, 220)}` : "";

    return {
      text: [
        `主题：${input}`,
        "",
        "这是一版面向简体中文用户的运营文案草稿，建议先突出用户痛点，再用清晰的产品收益承接行动。",
        "",
        "推荐表达：",
        `- 用一句话说明「${input}」能解决什么问题。`,
        "- 补充 2-3 个具体使用场景，避免空泛承诺。",
        "- 结尾引导用户进入工具页或立即保存草稿。",
        promptPreview
      ].join("\n"),
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

  private async getModelForScenario(scenario: AiScenarioRecord): Promise<ActiveAiModel | null> {
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

    const model = alias.modelInstance;
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
        `当前默认模型不支持${missing.map(capabilityLabel).join("、")}，请在后台配置支持对应能力的模型。`,
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

  private shouldSimulateFailure(input: string) {
    const normalized = input.toLowerCase();

    return normalized.includes("fail") || input.includes("触发失败");
  }

  private providerErrorMessage(error: unknown) {
    if (error instanceof AppException) {
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
    defaultBaseUrl: string;
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
      defaultBaseUrl: preset.defaultBaseUrl,
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

function normalizeCapabilityTags(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim().toUpperCase()).filter(Boolean))).slice(0, 12);
}

function promptVariablesFromInputSchema(schema: ToolInputSchema) {
  return schema.fields
    .filter((field) => field.name !== "input")
    .map((field) => ({
      name: field.name,
      label: field.label,
      required: field.required,
      placeholder: field.placeholder
    }));
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

function integerValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
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
  const pattern = /{{\s*([a-zA-Z][a-zA-Z0-9_]{0,39})\s*}}|\{([a-zA-Z][a-zA-Z0-9_]{0,39})\}/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(template))) {
    names.add(match[1] ?? match[2]);
  }

  return Array.from(names);
}

function renderPromptTemplate(template: string, variables: Record<string, string>) {
  return template
    .replace(/{{\s*([a-zA-Z][a-zA-Z0-9_]{0,39})\s*}}/g, (_match, name: string) => variables[name] ?? "")
    .replace(/\{([a-zA-Z][a-zA-Z0-9_]{0,39})\}/g, (_match, name: string) => variables[name] ?? "");
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
  const value = Number(process.env.AI_GATEWAY_TIMEOUT_MS ?? 30_000);

  return Number.isFinite(value) && value > 0 ? value : 30_000;
}

function aiTemperature() {
  const value = Number(process.env.AI_PROVIDER_TEMPERATURE ?? 0.7);

  return Number.isFinite(value) ? value : 0.7;
}

function aiMaxTokens() {
  const value = Number(process.env.AI_PROVIDER_MAX_TOKENS ?? 800);

  return Number.isFinite(value) && value > 0 ? Math.round(value) : 800;
}
