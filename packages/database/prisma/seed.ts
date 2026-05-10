import { encryptSecret, getPrismaClient, hashPassword, maskSecret } from "../src/index.js";
import { seedAiPresets } from "./seed-ai-presets.js";
import { seedAiToolTemplates } from "./seed-ai-tool-templates.js";

async function main() {
  const prisma = getPrismaClient();
  const email = process.env.DEFAULT_ADMIN_EMAIL;
  const password = process.env.DEFAULT_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("请在环境变量中配置 DEFAULT_ADMIN_EMAIL 和 DEFAULT_ADMIN_PASSWORD。");
  }

  const passwordHash = await hashPassword(password);

  await prisma.adminUser.upsert({
    where: {
      email
    },
    update: {
      passwordHash,
      name: "超级管理员",
      role: "SUPER_ADMIN",
      status: "ACTIVE"
    },
    create: {
      email,
      passwordHash,
      name: "超级管理员",
      role: "SUPER_ADMIN",
      status: "ACTIVE"
    }
  });

  console.log(`默认管理员已就绪：${email}`);

  const category = await prisma.articleCategory.upsert({
    where: {
      slug: "product-design"
    },
    update: {
      name: "产品设计",
      description: "围绕 AI SaaS 产品规划、页面体验和内容运营的文章。",
      sortOrder: 10,
      isVisible: true
    },
    create: {
      name: "产品设计",
      slug: "product-design",
      description: "围绕 AI SaaS 产品规划、页面体验和内容运营的文章。",
      sortOrder: 10,
      isVisible: true
    }
  });

  await prisma.article.upsert({
    where: {
      slug: "demo"
    },
    update: {
      categoryId: category.id,
      title: "如何搭建内容型 AI SaaS 的第一批页面",
      summary: "从首页、文章、单页、用户中心和后台管理开始，让产品先具备可访问的运营界面。",
      content:
        "第一阶段的关键不是把所有业务逻辑一次做完，而是先让团队和用户都能看见产品的基本形态。\n\n前台页面负责建立信任和内容入口，管理后台负责让运营人员知道内容管理会如何展开。\n\n这一版 CMS 已经接入真实数据库，后续可以继续扩展编辑体验和发布流程。",
      status: "PUBLISHED",
      seoTitle: "AI SaaS 内容工具站第一批页面",
      seoDescription: "介绍内容型 AI SaaS 在第一阶段应优先完成的可见页面和 CMS 基础。",
      publishedAt: new Date()
    },
    create: {
      categoryId: category.id,
      title: "如何搭建内容型 AI SaaS 的第一批页面",
      slug: "demo",
      summary: "从首页、文章、单页、用户中心和后台管理开始，让产品先具备可访问的运营界面。",
      content:
        "第一阶段的关键不是把所有业务逻辑一次做完，而是先让团队和用户都能看见产品的基本形态。\n\n前台页面负责建立信任和内容入口，管理后台负责让运营人员知道内容管理会如何展开。\n\n这一版 CMS 已经接入真实数据库，后续可以继续扩展编辑体验和发布流程。",
      status: "PUBLISHED",
      seoTitle: "AI SaaS 内容工具站第一批页面",
      seoDescription: "介绍内容型 AI SaaS 在第一阶段应优先完成的可见页面和 CMS 基础。",
      publishedAt: new Date()
    }
  });

  await prisma.page.upsert({
    where: {
      slug: "about"
    },
    update: {
      title: "关于我们",
      content:
        "AI SaaS 是一个以简体中文体验为核心的产品底座，第一阶段聚焦前台页面、登录闭环、后台管理和基础 CMS。\n\n项目会逐步预留支付宝、微信支付、点数钱包和 AI 任务编排能力，但当前版本优先保证内容发布闭环可靠。",
      status: "PUBLISHED",
      seoTitle: "关于 AI SaaS",
      seoDescription: "了解 AI SaaS 内容工具站底座的产品定位和阶段目标。",
      publishedAt: new Date()
    },
    create: {
      title: "关于我们",
      slug: "about",
      content:
        "AI SaaS 是一个以简体中文体验为核心的产品底座，第一阶段聚焦前台页面、登录闭环、后台管理和基础 CMS。\n\n项目会逐步预留支付宝、微信支付、点数钱包和 AI 任务编排能力，但当前版本优先保证内容发布闭环可靠。",
      status: "PUBLISHED",
      seoTitle: "关于 AI SaaS",
      seoDescription: "了解 AI SaaS 内容工具站底座的产品定位和阶段目标。",
      publishedAt: new Date()
    }
  });

  console.log("默认 CMS 分类、文章和单页已就绪。");

  const systemConfigs = [
    {
      key: "siteName",
      label: "站点名称",
      value: "AI SaaS",
      description: "用于前台、后台和浏览器标题的站点名称。",
      isPublic: true,
      sortOrder: 10
    },
    {
      key: "siteLogo",
      label: "站点 Logo",
      value: "",
      description: "前台导航和运营物料可使用的 Logo 图片地址。",
      isPublic: true,
      sortOrder: 15
    },
    {
      key: "themePrimaryColor",
      label: "主题主色",
      value: "#292524",
      description: "前台按钮、链接和强调元素使用的主色，只允许 6 位十六进制颜色。",
      isPublic: true,
      sortOrder: 16
    },
    {
      key: "publicNavItems",
      label: "前台导航菜单",
      value: "首页|/\n功能|/features\n场景|/use-cases\n工具|/tools\n价格|/pricing\n文章|/articles\n用户中心|/dashboard",
      description: "每行一个菜单，格式为 名称|站内路径，最多 12 项。",
      isPublic: true,
      sortOrder: 17
    },
    {
      key: "footerText",
      label: "Footer 文案",
      value: "面向中国市场的简体中文 AI SaaS / 内容型工具站底座。",
      description: "前台页脚展示的站点说明。",
      isPublic: true,
      sortOrder: 18
    },
    {
      key: "homeTitle",
      label: "首页标题",
      value: "面向内容型 AI SaaS 的第一批可运营页面",
      description: "前台首页首屏标题。",
      isPublic: true,
      sortOrder: 19
    },
    {
      key: "homeDescription",
      label: "首页描述",
      value: "首页、文章、单页、用户中心和管理后台已经连成可访问的中文界面。",
      description: "前台首页首屏描述。",
      isPublic: true,
      sortOrder: 20
    },
    {
      key: "homeCtaText",
      label: "首页 CTA 文案",
      value: "免费注册",
      description: "首页首屏主按钮文案。",
      isPublic: true,
      sortOrder: 21
    },
    {
      key: "homeCtaHref",
      label: "首页 CTA 链接",
      value: "/register",
      description: "首页首屏主按钮链接。",
      isPublic: true,
      sortOrder: 22
    },
    {
      key: "homeFeatureHighlights",
      label: "首页功能亮点",
      value: "可访问路由\n中文界面\n真实 CMS\n后台管理\n登录闭环",
      description: "首页展示的功能亮点，每行一个项目。",
      isPublic: true,
      sortOrder: 23
    },
    {
      key: "homeLatestArticleCount",
      label: "首页最新文章数量",
      value: "3",
      description: "首页展示的最新文章数量。",
      isPublic: true,
      sortOrder: 24
    },
    {
      key: "seoTitle",
      label: "SEO 标题",
      value: "AI SaaS - 简体中文内容型工具站底座",
      description: "默认 SEO 标题。",
      isPublic: true,
      sortOrder: 25
    },
    {
      key: "seoDescription",
      label: "SEO 描述",
      value: "面向中国市场的简体中文 AI SaaS / 内容型工具站底座。",
      description: "默认 SEO 描述。",
      isPublic: true,
      sortOrder: 26
    },
    {
      key: "siteUrl",
      label: "前台地址",
      value: process.env.APP_BASE_URL ?? "http://localhost:7341",
      description: "对外展示和运营校验使用的前台访问地址。",
      isPublic: true,
      sortOrder: 27
    },
    {
      key: "siteDescription",
      label: "站点描述",
      value: "面向中国市场的简体中文 AI SaaS / 内容型工具站底座。",
      description: "用于首页、SEO 和后台识别的简短介绍。",
      isPublic: true,
      sortOrder: 30
    },
    {
      key: "beianNo",
      label: "备案号",
      value: "待备案",
      description: "前台页脚展示的备案号。",
      isPublic: true,
      sortOrder: 35
    },
    {
      key: "serviceQrCode",
      label: "客服二维码",
      value: "",
      description: "客服二维码图片地址，仅对前台展示需要的地址公开。",
      isPublic: true,
      sortOrder: 36
    },
    {
      key: "defaultCreditExchangeRate",
      label: "默认点数兑换比例",
      value: "1 元 = 100 点",
      description: "后台展示使用的默认点数兑换说明。",
      isPublic: false,
      sortOrder: 37
    },
    {
      key: "defaultAiModel",
      label: "默认 AI 模型",
      value: "本地 mock",
      description: "后台运营识别使用的默认 AI 模型名称。",
      isPublic: false,
      sortOrder: 38
    },
    {
      key: "aiSaveFullContent",
      label: "AI 完整内容保存",
      value: "false",
      description: "默认仅保存输入输出预览与哈希；明确启用后才保存完整 Prompt 和生成内容。",
      isPublic: false,
      sortOrder: 39
    },
    {
      key: "apiBaseUrl",
      label: "API 地址",
      value: process.env.API_BASE_URL ?? "http://localhost:7342/api",
      description: "核心业务 API 的基础地址。",
      isPublic: false,
      sortOrder: 40
    },
    {
      key: "registrationStatus",
      label: "注册入口",
      value: "开放",
      description: "前台用户注册入口的运营状态。",
      isPublic: false,
      sortOrder: 50
    }
  ];

  await Promise.all(
    systemConfigs.map((config) =>
      prisma.systemConfig.upsert({
        where: {
          key: config.key
        },
        update: {
          label: config.label,
          description: config.description,
          isPublic: config.isPublic,
          sortOrder: config.sortOrder
        },
        create: {
          ...config,
          group: "site"
        }
      })
    )
  );

  console.log("默认系统配置已就绪。");

  const toolSeedResult = await seedAiToolTemplates(prisma);
  console.log(
    `默认 AI 工具模板已就绪：${toolSeedResult.categoryCount} 个分类，${toolSeedResult.templateCount} 个模板，新增 ${toolSeedResult.createdCount} 个，保留 ${toolSeedResult.preservedCount} 个。`
  );

  const workflowSteps = [
    {
      name: "生成初稿",
      prompt: "根据输入生成初稿",
      sortOrder: 0
    },
    {
      name: "改写优化",
      prompt: "保持事实不变并优化表达",
      sortOrder: 1
    },
    {
      name: "总结要点",
      prompt: "总结为三条要点",
      sortOrder: 2
    }
  ];
  const existingWorkflow = await prisma.aiWorkflow.findUnique({
    where: {
      slug: "content-three-step"
    },
    include: {
      steps: {
        orderBy: {
          sortOrder: "asc"
        }
      }
    }
  });

  if (existingWorkflow) {
    await prisma.aiWorkflow.update({
      where: {
        id: existingWorkflow.id
      },
      data: {
        name: "内容三步工作流",
        description: "输入后依次生成、改写和总结。",
        costCredits: 0,
        isEnabled: true
      }
    });

    for (const step of workflowSteps) {
      const existingStep = existingWorkflow.steps.find((item) => item.sortOrder === step.sortOrder);

      if (existingStep) {
        await prisma.aiWorkflowStep.update({
          where: {
            id: existingStep.id
          },
          data: step
        });
      } else {
        await prisma.aiWorkflowStep.create({
          data: {
            workflowId: existingWorkflow.id,
            ...step
          }
        });
      }
    }
  } else {
    await prisma.aiWorkflow.create({
      data: {
        name: "内容三步工作流",
        slug: "content-three-step",
        description: "输入后依次生成、改写和总结。",
        costCredits: 0,
        isEnabled: true,
        steps: {
          create: workflowSteps
        }
      }
    });
  }

  console.log("默认 AI 工作流已就绪：内容三步工作流。");

  const aiPresetResult = await seedAiPresets(prisma);
  console.log(
    `AI Provider / Model Preset 已就绪：${aiPresetResult.providerCount} 个 Provider，${aiPresetResult.modelCount} 个模型。`
  );

  await seedAiProvider(prisma);

  const users = await prisma.user.findMany({
    select: {
      id: true
    }
  });

  await Promise.all(
    users.map((user) =>
      prisma.wallet.upsert({
        where: {
          userId: user.id
        },
        update: {},
        create: {
          userId: user.id
        }
      })
    )
  );

  console.log("已有用户钱包已就绪。");
}

void main().catch((error) => {
  console.error("Seed 执行失败。", error);
  process.exit(1);
});

async function seedAiProvider(prisma: ReturnType<typeof getPrismaClient>) {
  const apiKey = process.env.AI_PROVIDER_API_KEY?.trim();
  const encryptionKey = process.env.SECRET_ENCRYPTION_KEY?.trim();
  const baseUrl = process.env.AI_PROVIDER_BASE_URL?.trim();
  const modelName = process.env.AI_PROVIDER_MODEL_NAME?.trim();

  if (!apiKey && !baseUrl && !modelName) {
    console.log("未配置默认 AI Provider，继续使用本地 mock 生成。");
    return;
  }

  if (!apiKey || !encryptionKey || !baseUrl || !modelName) {
    console.warn("默认 AI Provider 配置不完整，已跳过 Provider seed。");
    return;
  }

  const name = process.env.AI_PROVIDER_NAME?.trim() || "默认 OpenAI-compatible Provider";
  const existing = await prisma.aiProvider.findFirst({
    where: {
      name
    }
  });
  const provider = existing
    ? await prisma.aiProvider.update({
        where: {
          id: existing.id
        },
        data: {
          type: "OPENAI_COMPATIBLE",
          baseUrl: normalizeBaseUrl(baseUrl),
          apiKeyEncrypted: encryptSecret(apiKey, encryptionKey),
          apiKeyPreview: maskSecret(apiKey),
          isEnabled: true
        }
      })
    : await prisma.aiProvider.create({
        data: {
          name,
          type: "OPENAI_COMPATIBLE",
          baseUrl: normalizeBaseUrl(baseUrl),
          apiKeyEncrypted: encryptSecret(apiKey, encryptionKey),
          apiKeyPreview: maskSecret(apiKey),
          isEnabled: true
        }
      });

  await prisma.aiModel.upsert({
    where: {
      providerId_modelName: {
        providerId: provider.id,
        modelName
      }
    },
    update: {
      displayName: process.env.AI_PROVIDER_MODEL_DISPLAY_NAME?.trim() || modelName,
      inputPrice: process.env.AI_PROVIDER_INPUT_PRICE ?? "1",
      outputPrice: process.env.AI_PROVIDER_OUTPUT_PRICE ?? "4",
      isEnabled: true
    },
    create: {
      providerId: provider.id,
      displayName: process.env.AI_PROVIDER_MODEL_DISPLAY_NAME?.trim() || modelName,
      modelName,
      inputPrice: process.env.AI_PROVIDER_INPUT_PRICE ?? "1",
      outputPrice: process.env.AI_PROVIDER_OUTPUT_PRICE ?? "4",
      isEnabled: true
    }
  });

  console.log(`默认 AI Provider 已就绪：${name}`);
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}
