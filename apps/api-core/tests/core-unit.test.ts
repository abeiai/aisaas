import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

process.env.JWT_ACCESS_SECRET ??= `test-access-${randomUUID()}`;
process.env.JWT_REFRESH_SECRET ??= `test-refresh-${randomUUID()}`;
process.env.SECRET_ENCRYPTION_KEY ??= `test-secret-${randomUUID()}-${randomUUID()}`;
process.env.ENABLE_MOCK_PAYMENT_NOTIFY ??= "1";

const unique = `unit-${Date.now()}`;

function responseMock() {
  return {
    cookie() {},
    clearCookie() {}
  };
}

async function loadModules() {
  const database = await import("@aisaas/database");
  const { AuthService } = await import("../src/auth/auth.service.js");
  const { AdminAuthService } = await import("../src/admin-auth/admin-auth.service.js");
  const { PublicContentService } = await import("../src/public-content/public-content.service.js");
  const { PaymentService } = await import("../src/payment/payment.service.js");
  const { AlipayClient } = await import("../src/payment/alipay.client.js");
  const { WechatPayClient } = await import("../src/payment/wechat-pay.client.js");
  const { PaymentConfigService } = await import("../src/payment/payment-config.service.js");
  const { detectPaymentScene, resolvePaymentProduct } = await import("../src/payment/payment-scene.js");
  const { AiService } = await import("../src/ai/ai.service.js");
  const { AudioService } = await import("../src/audio/audio.service.js");
  const { calculateUsageCredits } = await import("../src/ai/ai-cost.js");
  const { AdminUsersService } = await import("../src/operations/admin-users.service.js");

  return {
    ...database,
    AuthService,
    AdminAuthService,
    PublicContentService,
    PaymentService,
    AlipayClient,
    WechatPayClient,
    PaymentConfigService,
    detectPaymentScene,
    resolvePaymentProduct,
    AiService,
    AudioService,
    calculateUsageCredits,
    AdminUsersService
  };
}

test("核心业务单元测试", { timeout: 120_000 }, async (t) => {
  const {
    getPrismaClient,
    hashPassword,
    verifyPassword,
    AuthService,
    AdminAuthService,
    PublicContentService,
    PaymentService,
    AlipayClient,
    WechatPayClient,
    PaymentConfigService,
    detectPaymentScene,
    resolvePaymentProduct,
    AiService,
    AudioService,
    calculateUsageCredits,
    AdminUsersService
  } = await loadModules();
  const prisma = getPrismaClient();
  const authService = new AuthService();
  const adminAuthService = new AdminAuthService();
  const publicContentService = new PublicContentService();
  const paymentConfigService = new PaymentConfigService();
  const paymentService = new PaymentService(
    paymentConfigService,
    new AlipayClient(paymentConfigService),
    new WechatPayClient(paymentConfigService)
  );
  const aiService = new AiService();
  const audioService = new AudioService();
  const adminUsersService = new AdminUsersService();

  await t.after(async () => {
    const paymentOrders = await prisma.paymentOrder.findMany({
      where: {
        user: {
          email: {
            contains: unique
          }
        }
      },
      select: {
        orderNo: true
      }
    });

    if (paymentOrders.length > 0) {
      await prisma.paymentNotifyLog.deleteMany({
        where: {
          orderNo: {
            in: paymentOrders.map((order) => order.orderNo)
          }
        }
      });
    }

    await prisma.ledgerEntry.deleteMany({
      where: {
        user: {
          email: {
            contains: unique
          }
        }
      }
    });
    await prisma.aiCallLog.deleteMany({
      where: {
        task: {
          user: {
            email: {
              contains: unique
            }
          }
        }
      }
    });
    await prisma.creditReservation.deleteMany({
      where: {
        user: {
          email: {
            contains: unique
          }
        }
      }
    });
    await prisma.audioUsageLog.deleteMany({
      where: {
        user: {
          email: {
            contains: unique
          }
        }
      }
    });
    await prisma.voiceConsent.deleteMany({
      where: {
        user: {
          email: {
            contains: unique
          }
        }
      }
    });
    await prisma.audioTask.deleteMany({
      where: {
        user: {
          email: {
            contains: unique
          }
        }
      }
    });
    await prisma.voiceAsset.deleteMany({
      where: {
        user: {
          email: {
            contains: unique
          }
        }
      }
    });
    await prisma.audioAsset.deleteMany({
      where: {
        user: {
          email: {
            contains: unique
          }
        }
      }
    });
    await prisma.aiTask.deleteMany({
      where: {
        user: {
          email: {
            contains: unique
          }
        }
      }
    });
    await prisma.aiScenario.deleteMany({
      where: {
        slug: {
          contains: unique
        }
      }
    });
    await prisma.paymentOrder.deleteMany({
      where: {
        user: {
          email: {
            contains: unique
          }
        }
      }
    });
    await prisma.aiProvider.deleteMany({
      where: {
        name: {
          contains: unique
        }
      }
    });
    await prisma.audioPricingRule.deleteMany({
      where: {
        model: {
          contains: unique
        }
      }
    });
    await prisma.aiModelAlias.deleteMany({
      where: {
        aliasKey: {
          contains: unique
        }
      }
    });
    await prisma.aiProviderInstance.deleteMany({
      where: {
        providerPreset: {
          providerKey: {
            contains: unique
          }
        }
      }
    });
    await prisma.aiProviderPreset.deleteMany({
      where: {
        providerKey: {
          contains: unique
        }
      }
    });
    await prisma.wallet.deleteMany({
      where: {
        user: {
          email: {
            contains: unique
          }
        }
      }
    });
    await prisma.refreshToken.deleteMany({
      where: {
        user: {
          email: {
            contains: unique
          }
        }
      }
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: unique
        }
      }
    });
    await prisma.article.deleteMany({
      where: {
        slug: {
          contains: unique
        }
      }
    });
    await prisma.articleCategory.deleteMany({
      where: {
        slug: {
          contains: unique
        }
      }
    });
    await prisma.loginFailure.deleteMany({
      where: {
        subject: {
          contains: unique
        }
      }
    });
    await prisma.adminUser.deleteMany({
      where: {
        email: {
          contains: unique
        }
      }
    });
  });

  await t.test("密码使用哈希存储并可校验", async () => {
    const passwordHash = await hashPassword("Unit123456");

    assert.notEqual(passwordHash, "Unit123456");
    assert.equal(passwordHash.startsWith("scrypt$"), true);
    assert.equal(await verifyPassword("Unit123456", passwordHash), true);
    assert.equal(await verifyPassword("Wrong123456", passwordHash), false);
  });

  await t.test("用户登录失败返回中文错误", async () => {
    await assert.rejects(
      () =>
        authService.login(
          {
            email: `missing-${unique}@example.com`,
            password: "Wrong123456"
          },
          responseMock()
        ),
      (error: unknown) => error instanceof Error && error.message === "邮箱或密码错误"
    );
  });

  await t.test("管理员登录失败返回中文错误", async () => {
    await assert.rejects(
      () =>
        adminAuthService.login(
          {
            email: `missing-admin-${unique}@example.com`,
            password: "Wrong123456"
          },
          responseMock()
        ),
      (error: unknown) => error instanceof Error && error.message === "管理员邮箱或密码错误"
    );
  });

  await t.test("草稿文章不会被 public 查询返回", async () => {
    const category = await prisma.articleCategory.create({
      data: {
        name: "单元测试分类",
        slug: `${unique}-draft-category`,
        isVisible: true
      }
    });

    await prisma.article.create({
      data: {
        categoryId: category.id,
        title: "单元测试草稿文章",
        slug: `${unique}-draft-article`,
        content: "草稿内容",
        status: "DRAFT"
      }
    });

    await assert.rejects(
      () => publicContentService.getArticle(`${unique}-draft-article`),
      (error: unknown) => error instanceof Error && error.message === "文章不存在或尚未发布"
    );
  });

  await t.test("钱包充值回调不会重复入账", async () => {
    const user = await prisma.user.create({
      data: {
        email: `payment-${unique}@example.com`,
        passwordHash: await hashPassword("Unit123456"),
        nickname: "充值单元测试用户",
        wallet: {
          create: {}
        }
      }
    });
    const order = await paymentService.createOrder(user.id, {
      provider: "ALIPAY",
      packageCode: "starter"
    });

    await paymentService.handleMockNotify("ALIPAY", {
      orderNo: order.orderNo,
      providerTradeNo: `${unique}-trade`
    });
    await paymentService.handleMockNotify("ALIPAY", {
      orderNo: order.orderNo,
      providerTradeNo: `${unique}-trade-again`
    });

    const wallet = await prisma.wallet.findUniqueOrThrow({
      where: {
        userId: user.id
      }
    });
    const topUpLedgers = await prisma.ledgerEntry.count({
      where: {
        userId: user.id,
        type: "TOP_UP",
        relatedOrderId: order.id
      }
    });

    assert.equal(wallet.availableCredits, order.credits);
    assert.equal(wallet.totalTopUpCredits, order.credits);
    assert.equal(topUpLedgers, 1);

    const notifyLogs = await prisma.paymentNotifyLog.findMany({
      where: {
        orderNo: order.orderNo
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    assert.deepEqual(notifyLogs.map((log) => log.processResult), ["CREDITED", "DUPLICATE"]);
  });

  await t.test("支付场景会映射到正确产品", () => {
    assert.equal(detectPaymentScene("Mozilla/5.0 MicroMessenger"), "WECHAT_BROWSER");
    assert.equal(detectPaymentScene("Mozilla/5.0 iPhone Mobile"), "MOBILE_WEB");
    assert.equal(detectPaymentScene("Mozilla/5.0 Macintosh"), "DESKTOP_WEB");
    assert.equal(resolvePaymentProduct("ALIPAY", "DESKTOP_WEB"), "ALIPAY_PAGE");
    assert.equal(resolvePaymentProduct("ALIPAY", "MOBILE_WEB"), "ALIPAY_WAP");
    assert.equal(resolvePaymentProduct("ALIPAY", "WECHAT_BROWSER"), null);
    assert.equal(resolvePaymentProduct("WECHAT_PAY", "DESKTOP_WEB"), "WECHAT_NATIVE");
    assert.equal(resolvePaymentProduct("WECHAT_PAY", "MOBILE_WEB"), "WECHAT_H5");
    assert.equal(resolvePaymentProduct("WECHAT_PAY", "WECHAT_BROWSER"), "WECHAT_JSAPI");
  });

  await t.test("支付配置启用前会校验密钥格式", async () => {
    await assert.rejects(
      () =>
        paymentConfigService.updateConfig({
          alipayEnabled: true,
          alipayPageEnabled: true,
          alipayWapEnabled: true,
          alipayAppId: "2026000000000001",
          alipayEnvironment: "production",
          alipayPrivateKey: "not-a-private-key",
          alipayPublicKey: "not-a-public-key",
          alipayNotifyUrl: "https://example.com/api/payment/alipay/notify",
          alipayReturnUrl: "",
          wechatPayEnabled: false,
          wechatPayNativeEnabled: true,
          wechatPayH5Enabled: false,
          wechatPayJsapiEnabled: false,
          wechatPayAppId: "",
          wechatPayMerchantId: "",
          wechatPayApiV3Key: "",
          wechatPayMerchantPrivateKey: "",
          wechatPayMerchantSerialNo: "",
          wechatPayNotifyUrl: "",
          wechatPayPublicKey: "",
          wechatPayPublicKeyId: "",
          wechatPayAppSecret: "",
          wechatPayJsapiOauthCallbackUrl: ""
        }),
      (error: unknown) => error instanceof Error && error.message === "支付宝应用私钥格式不正确，请填写 PEM 格式或完整密钥内容"
    );
  });

  await t.test("AI usage 按输入和输出 token 计算点数", async () => {
    assert.equal(
      calculateUsageCredits({
        usage: {
          inputTokens: 1200,
          outputTokens: 300,
          totalTokens: 1500
        },
        inputPrice: 2,
        outputPrice: 8,
        fallbackCredits: 120,
        maxCredits: 120
      }),
      5
    );
    assert.equal(
      calculateUsageCredits({
        usage: null,
        inputPrice: 2,
        outputPrice: 8,
        fallbackCredits: 120,
        maxCredits: 120
      }),
      120
    );
    assert.equal(
      calculateUsageCredits({
        usage: {
          inputTokens: 1,
          outputTokens: 0,
          totalTokens: 1
        },
        inputPrice: 0,
        outputPrice: 0,
        fallbackCredits: 120,
        maxCredits: 120
      }),
      1
    );
  });

  await t.test("AI Provider API Key 加密存储并只返回掩码", async () => {
    const apiKey = `sk-${unique}-secret-value`;
    const provider = await aiService.createProvider({
      name: `Provider ${unique}`,
      type: "OPENAI_COMPATIBLE",
      baseUrl: "https://api.example.com/v1",
      apiKey,
      modelDisplayName: "单元测试模型",
      modelName: `model-${unique}`,
      inputPrice: 1,
      outputPrice: 4,
      isEnabled: false
    });
    const rawProvider = await prisma.aiProvider.findUniqueOrThrow({
      where: {
        id: provider.id
      }
    });

    assert.notEqual(rawProvider.apiKeyEncrypted, apiKey);
    assert.equal(rawProvider.apiKeyEncrypted.includes(apiKey), false);
    assert.equal(provider.apiKeyPreview, `sk-u****alue`);
    assert.equal(Object.prototype.hasOwnProperty.call(provider, "apiKeyEncrypted"), false);
  });

  await t.test("管理员禁用用户后已有会话会被拒绝", async () => {
    const email = `disabled-${unique}@example.com`;
    await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword("Unit123456"),
        nickname: "禁用测试用户",
        wallet: {
          create: {
            availableCredits: 200
          }
        }
      }
    });

    const session = await authService.login(
      {
        email,
        password: "Unit123456"
      },
      responseMock()
    );

    await adminUsersService.updateStatus(session.user.id, "DISABLED");

    await assert.rejects(
      () =>
        authService.me({
          headers: {
            authorization: `Bearer ${session.accessToken}`
          }
        }),
      (error: unknown) => error instanceof Error && error.message === "登录状态已失效，请重新登录"
    );
  });

  await t.test("管理员手动加减点数写入流水且不能扣成负数", async () => {
    const user = await prisma.user.create({
      data: {
        email: `adjust-${unique}@example.com`,
        passwordHash: await hashPassword("Unit123456"),
        nickname: "调点测试用户",
        wallet: {
          create: {
            availableCredits: 100
          }
        }
      }
    });

    const added = await adminUsersService.adjustCredits(user.id, {
      amount: 50,
      reason: "单元测试加点"
    });
    assert.equal(added.wallet.availableCredits, 150);
    assert.equal(added.ledgerEntry.type, "ADMIN_ADJUST");
    assert.equal(added.ledgerEntry.amount, 50);

    const deducted = await adminUsersService.adjustCredits(user.id, {
      amount: -80,
      reason: "单元测试扣点"
    });
    assert.equal(deducted.wallet.availableCredits, 70);

    await assert.rejects(
      () =>
        adminUsersService.adjustCredits(user.id, {
          amount: -100,
          reason: "单元测试超额扣点"
        }),
      (error: unknown) => error instanceof Error && error.message === "可用点数不足，不能扣成负数"
    );
  });

  await t.test("AI 任务失败会释放冻结点数", async () => {
    const scenario = await prisma.aiScenario.create({
      data: {
        name: `单元测试 AI 场景 ${unique}`,
        slug: `unit-ai-failed-${unique}`,
        description: "单元测试专用场景",
        promptTemplate: "主题：{{topic}}\n受众：{{audience}}\n语气：{{tone}}\n\n{input}",
        promptVariables: [
          {
            name: "topic",
            label: "主题",
            required: true
          },
          {
            name: "audience",
            label: "目标受众",
            required: true
          },
          {
            name: "tone",
            label: "语气",
            required: true
          }
        ],
        costCredits: 20,
        isEnabled: true
      }
    });
    const user = await prisma.user.create({
      data: {
        email: `ai-failed-${unique}@example.com`,
        passwordHash: await hashPassword("Unit123456"),
        nickname: "AI 单元测试用户",
        wallet: {
          create: {
            availableCredits: scenario.costCredits
          }
        }
      }
    });

    const task = await aiService.createTask(user.id, {
      scenarioId: scenario.id,
      input: "触发失败",
      variables: {
        topic: "失败释放",
        audience: "单元测试用户",
        tone: "直接"
      }
    });
    const wallet = await prisma.wallet.findUniqueOrThrow({
      where: {
        userId: user.id
      }
    });

    assert.equal(task.status, "FAILED");
    assert.equal(wallet.availableCredits, scenario.costCredits);
    assert.equal(wallet.frozenCredits, 0);
  });

  await t.test("AI Prompt 模板不会把 LaTeX 大括号误判为变量", async () => {
    const scenario = await prisma.aiScenario.create({
      data: {
        name: `单元测试 LaTeX 场景 ${unique}`,
        slug: `unit-ai-latex-${unique}`,
        description: "单元测试专用场景",
        promptTemplate:
          "请解释向量公式：\n\\[\\nabla \\cdot \\mathbf{F} = \\frac{\\partial F_x}{\\partial x}\\]\n\n用户问题：{input}",
        promptVariables: [],
        costCredits: 0,
        isEnabled: true
      }
    });
    const user = await prisma.user.create({
      data: {
        email: `ai-latex-${unique}@example.com`,
        passwordHash: await hashPassword("Unit123456"),
        nickname: "AI LaTeX 单元测试用户",
        wallet: {
          create: {
            availableCredits: 0
          }
        }
      }
    });

    const task = await aiService.createTask(user.id, {
      scenarioId: scenario.id,
      input: "说明散度公式",
      variables: {}
    });

    assert.equal(task.status, "SUCCEEDED");
    const savedTask = await prisma.aiTask.findUniqueOrThrow({
      where: {
        id: task.id
      }
    });
    assert.match(savedTask.renderedPrompt, /\\mathbf\{F\}/);
    assert.match(savedTask.renderedPrompt, /说明散度公式/);
  });

  await t.test("语音工具 schema 支持新增字段并校验 slider 范围", async () => {
    const schemaTools = aiService as unknown as {
      normalizeInputSchema(value: unknown, strict: boolean): {
        fields: Array<{
          name: string;
          type: string;
          min?: number;
          max?: number;
          defaultValue?: string | number | boolean;
          accept?: string[];
          maxSizeMb?: number;
        }>;
      };
    };
    const schema = schemaTools.normalizeInputSchema(
      {
        fields: [
          {
            name: "voiceId",
            label: "选择音色",
            type: "voice-select",
            required: true
          },
          {
            name: "sourceAudio",
            label: "声音样本",
            type: "audio-upload",
            required: true,
            accept: ["audio/wav"],
            maxSizeMb: 20
          },
          {
            name: "speed",
            label: "语速",
            type: "slider",
            min: 0.5,
            max: 2,
            default: 1
          },
          {
            name: "format",
            label: "输出格式",
            type: "format-select"
          },
          {
            name: "preview",
            label: "试听",
            type: "audio-preview"
          }
        ]
      },
      true
    );

    assert.equal(schema.fields.length, 5);
    assert.equal(schema.fields[2]?.defaultValue, 1);
    assert.deepEqual(schema.fields[3]?.type, "format-select");
    assert.deepEqual(schema.fields[3]?.accept, []);
    assert.deepEqual(schema.fields[1]?.accept, ["audio/wav"]);
    assert.equal(schema.fields[1]?.maxSizeMb, 20);

    assert.throws(
      () =>
        schemaTools.normalizeInputSchema(
          {
            fields: [
              {
                name: "speed",
                label: "语速",
                type: "slider",
                min: 2,
                max: 0.5
              }
            ]
          },
          true
        ),
      /最小值不能大于最大值/
    );
  });

  await t.test("语音任务失败会释放冻结点数并校验自定义音色模型", async () => {
    const providerPreset = await prisma.aiProviderPreset.create({
      data: {
        providerKey: `audio-${unique}`,
        displayName: "单元测试语音 Provider",
        adapterType: "DASHSCOPE_AUDIO",
        modality: "AUDIO",
        defaultBaseUrl: "https://dashscope.aliyuncs.com/api/v1",
        defaultWebSocketUrl: "wss://dashscope.aliyuncs.com/api-ws/v1/inference",
        apiKeyEnvName: "DASHSCOPE_API_KEY",
        region: "cn-beijing",
        isBuiltIn: true,
        isEnabledByDefault: false,
        presetVersion: "unit",
        lastUpdatedAt: new Date()
      }
    });
    const providerInstance = await prisma.aiProviderInstance.create({
      data: {
        providerPresetId: providerPreset.id,
        name: "单元测试语音实例",
        baseUrl: providerPreset.defaultBaseUrl,
        webSocketUrl: providerPreset.defaultWebSocketUrl,
        region: "cn-beijing",
        status: "ENABLED"
      }
    });
    const modelInstance = await prisma.aiModelInstance.create({
      data: {
        providerInstanceId: providerInstance.id,
        displayName: "单元测试 TTS 模型",
        providerModelName: `cosyvoice-${unique}`,
        capabilityTags: ["AUDIO", "TTS", "CUSTOM_VOICE"],
        isEnabled: true
      }
    });
    await prisma.audioPricingRule.create({
      data: {
        operationType: "TTS",
        model: modelInstance.providerModelName,
        billingMode: "PER_CHARACTER",
        creditsPerUnit: 5,
        minimumCredits: 5,
        modelMultiplier: 1,
        isEnabled: true
      }
    });
    const alias = await prisma.aiModelAlias.create({
      data: {
        aliasKey: `tts-${unique}`,
        displayName: "单元测试语音别名",
        modelInstanceId: modelInstance.id
      }
    });
    const user = await prisma.user.create({
      data: {
        email: `audio-${unique}@example.com`,
        passwordHash: await hashPassword("Unit123456"),
        nickname: "语音单元测试用户",
        wallet: {
          create: {
            availableCredits: 10
          }
        }
      }
    });

    const task = await audioService.createTtsTask(user.id, {
      text: "你好，欢迎使用语音合成。",
      modelAlias: alias.aliasKey,
      voice: "longxiaochun"
    });
    let wallet = await prisma.wallet.findUniqueOrThrow({
      where: {
        userId: user.id
      }
    });

    assert.equal(task.status, "RESERVED");
    assert.equal(wallet.availableCredits, 5);
    assert.equal(wallet.frozenCredits, 5);

    const failedTask = await audioService.failAudioTask(task.id, "UNIT_FAILED", "单元测试语音失败");
    wallet = await prisma.wallet.findUniqueOrThrow({
      where: {
        userId: user.id
      }
    });

    assert.equal(failedTask.status, "FAILED");
    assert.equal(wallet.availableCredits, 10);
    assert.equal(wallet.frozenCredits, 0);

    const failedUsageLog = await prisma.audioUsageLog.findUnique({
      where: {
        taskId: task.id
      }
    });
    const failedConsumeLedgers = await prisma.ledgerEntry.count({
      where: {
        relatedAudioTaskId: task.id,
        type: "CONSUME"
      }
    });

    assert.equal(failedUsageLog?.success, false);
    assert.equal(failedUsageLog?.consumedCredits, 0);
    assert.equal(failedConsumeLedgers, 0);

    const voiceAsset = await prisma.voiceAsset.create({
      data: {
        userId: user.id,
        provider: providerPreset.providerKey,
        providerInstanceId: providerInstance.id,
        providerVoiceId: "unit-voice",
        name: "不匹配音色",
        type: "CLONED",
        targetModel: "another-model",
        status: "READY",
        visibility: "PRIVATE"
      }
    });

    await assert.rejects(
      () =>
        audioService.createTtsTask(user.id, {
          text: "测试音色模型校验",
          modelAlias: alias.aliasKey,
          voiceAssetId: voiceAsset.id
        }),
      (error: unknown) => error instanceof Error && error.message === "自定义音色与当前合成模型不匹配"
    );
  });

  await t.test("语音合成默认别名未绑定时会按系统音色匹配可用模型", async () => {
    const previousAlias = await prisma.aiModelAlias.findUnique({
      where: {
        aliasKey: "tts-default"
      }
    });
    const previousWildcardPricing = await prisma.audioPricingRule.findUnique({
      where: {
        operationType_model: {
          operationType: "TTS",
          model: "*"
        }
      }
    });
    const providerPreset = await prisma.aiProviderPreset.create({
      data: {
        providerKey: `audio-fallback-${unique}`,
        displayName: "单元测试语音兜底 Provider",
        adapterType: "DASHSCOPE_AUDIO",
        modality: "AUDIO",
        defaultBaseUrl: "https://dashscope.aliyuncs.com/api/v1",
        defaultWebSocketUrl: "wss://dashscope.aliyuncs.com/api-ws/v1/inference",
        apiKeyEnvName: "DASHSCOPE_API_KEY",
        region: "cn-beijing",
        isBuiltIn: true,
        isEnabledByDefault: false,
        presetVersion: "unit",
        lastUpdatedAt: new Date()
      }
    });
    const providerInstance = await prisma.aiProviderInstance.create({
      data: {
        providerPresetId: providerPreset.id,
        name: "单元测试语音兜底实例",
        baseUrl: providerPreset.defaultBaseUrl,
        webSocketUrl: providerPreset.defaultWebSocketUrl,
        region: "cn-beijing",
        status: "ENABLED"
      }
    });
    await prisma.aiModelInstance.create({
      data: {
        providerInstanceId: providerInstance.id,
        displayName: "单元测试 CosyVoice v3 Flash 兜底",
        providerModelName: "cosyvoice-v3-flash",
        capabilityTags: ["AUDIO", "TTS", "SYSTEM_VOICE"],
        isEnabled: true
      }
    });
    const user = await prisma.user.create({
      data: {
        email: `audio-fallback-${unique}@example.com`,
        passwordHash: await hashPassword("Unit123456"),
        nickname: "语音兜底单元测试用户",
        wallet: {
          create: {
            availableCredits: 20
          }
        }
      }
    });

    try {
      await prisma.aiModelAlias.upsert({
        where: {
          aliasKey: "tts-default"
        },
        update: {
          displayName: "默认语音合成模型",
          modelInstanceId: null
        },
        create: {
          aliasKey: "tts-default",
          displayName: "默认语音合成模型",
          modelInstanceId: null
        }
      });
      await prisma.audioPricingRule.upsert({
        where: {
          operationType_model: {
            operationType: "TTS",
            model: "*"
          }
        },
        update: {
          billingMode: "PER_CHARACTER",
          creditsPerUnit: 5,
          minimumCredits: 5,
          modelMultiplier: 1,
          isEnabled: true
        },
        create: {
          operationType: "TTS",
          model: "*",
          billingMode: "PER_CHARACTER",
          creditsPerUnit: 5,
          minimumCredits: 5,
          modelMultiplier: 1,
          isEnabled: true
        }
      });

      const task = await audioService.createTtsTask(user.id, {
        text: "默认别名未绑定时，仍然应该按系统音色匹配可用模型。",
        modelAlias: "tts-default",
        voice: "longanyang",
        execute: false
      });

      assert.equal(task.status, "RESERVED");
      assert.equal(task.model, "cosyvoice-v3-flash");
    } finally {
      if (previousAlias) {
        await prisma.aiModelAlias.update({
          where: {
            aliasKey: "tts-default"
          },
          data: {
            displayName: previousAlias.displayName,
            description: previousAlias.description,
            modelInstanceId: previousAlias.modelInstanceId
          }
        });
      } else {
        await prisma.aiModelAlias.deleteMany({
          where: {
            aliasKey: "tts-default"
          }
        });
      }

      if (previousWildcardPricing) {
        await prisma.audioPricingRule.update({
          where: {
            operationType_model: {
              operationType: "TTS",
              model: "*"
            }
          },
          data: {
            billingMode: previousWildcardPricing.billingMode,
            creditsPerUnit: previousWildcardPricing.creditsPerUnit,
            minimumCredits: previousWildcardPricing.minimumCredits,
            modelMultiplier: previousWildcardPricing.modelMultiplier,
            isEnabled: previousWildcardPricing.isEnabled
          }
        });
      } else {
        await prisma.audioPricingRule.deleteMany({
          where: {
            operationType: "TTS",
            model: "*"
          }
        });
      }
    }
  });

  await t.test("管理员可以管理官方系统音色并控制前台可用性", async () => {
    const configKey = "cosyVoiceSystemVoiceOverrides";
    const previousConfig = await prisma.systemConfig.findUnique({
      where: {
        key: configKey
      }
    });
    const providerPreset = await prisma.aiProviderPreset.create({
      data: {
        providerKey: `system-voice-${unique}`,
        displayName: "单元测试系统音色 Provider",
        adapterType: "DASHSCOPE_AUDIO",
        modality: "AUDIO",
        defaultBaseUrl: "https://dashscope.aliyuncs.com/api/v1",
        defaultWebSocketUrl: "wss://dashscope.aliyuncs.com/api-ws/v1/inference",
        apiKeyEnvName: "DASHSCOPE_API_KEY",
        region: "cn-beijing",
        isBuiltIn: true,
        isEnabledByDefault: false,
        presetVersion: "unit",
        lastUpdatedAt: new Date()
      }
    });
    const providerInstance = await prisma.aiProviderInstance.create({
      data: {
        providerPresetId: providerPreset.id,
        name: "单元测试系统音色实例",
        baseUrl: providerPreset.defaultBaseUrl,
        webSocketUrl: providerPreset.defaultWebSocketUrl,
        region: "cn-beijing",
        status: "ENABLED"
      }
    });
    const modelInstance = await prisma.aiModelInstance.create({
      data: {
        providerInstanceId: providerInstance.id,
        displayName: "单元测试 CosyVoice v3 Flash",
        providerModelName: "cosyvoice-v3-flash",
        capabilityTags: ["AUDIO", "TTS", "SYSTEM_VOICE"],
        isEnabled: true
      }
    });
    const alias = await prisma.aiModelAlias.create({
      data: {
        aliasKey: `system-voice-tts-${unique}`,
        displayName: "单元测试系统音色别名",
        modelInstanceId: modelInstance.id
      }
    });
    const user = await prisma.user.create({
      data: {
        email: `system-voice-${unique}@example.com`,
        passwordHash: await hashPassword("Unit123456"),
        nickname: "系统音色单元测试用户",
        wallet: {
          create: {
            availableCredits: 10
          }
        }
      }
    });

    try {
      const disabled = await audioService.updateAdminSystemVoice("longanyang", {
        name: "龙安洋测试",
        description: "后台管理覆盖描述",
        trait: "后台覆盖特质",
        scene: "后台覆盖场景",
        ageCategory: "青年",
        status: "DISABLED",
        disabledReason: "单元测试禁用"
      });

      assert.equal(disabled.status, "DISABLED");
      assert.equal(disabled.name, "龙安洋测试");
      assert.equal(disabled.disabledReason, "单元测试禁用");

      const filtered = await audioService.listAdminSystemVoiceAssets({
        keyword: "longanyang",
        status: "DISABLED",
        model: "cosyvoice-v3-plus"
      });
      const library = await audioService.listVoiceAssets(user.id);

      assert.equal(filtered.length, 1);
      assert.equal(library.systemVoices.some((voice) => voice.providerVoiceId === "longanyang"), false);
      await assert.rejects(
        () =>
          audioService.createTtsTask(user.id, {
            text: "测试禁用系统音色",
            modelAlias: alias.aliasKey,
            voice: "longanyang",
            execute: false
          }),
        (error: unknown) => error instanceof Error && error.message === "系统音色「龙安洋测试」已禁用，不能用于合成"
      );
    } finally {
      if (previousConfig) {
        await prisma.systemConfig.update({
          where: {
            key: configKey
          },
          data: {
            value: previousConfig.value
          }
        });
      } else {
        await prisma.systemConfig.deleteMany({
          where: {
            key: configKey
          }
        });
      }
    }
  });

  await t.test("管理员可以禁用语音模型并绑定用途别名", async () => {
    const previousAlias = await prisma.aiModelAlias.findUnique({
      where: {
        aliasKey: "tts-fast"
      }
    });
    const providerPreset = await prisma.aiProviderPreset.create({
      data: {
        providerKey: `audio-model-admin-${unique}`,
        displayName: "单元测试语音模型管理 Provider",
        adapterType: "DASHSCOPE_AUDIO",
        modality: "AUDIO",
        defaultBaseUrl: "https://dashscope.aliyuncs.com/api/v1",
        defaultWebSocketUrl: "wss://dashscope.aliyuncs.com/api-ws/v1/inference",
        apiKeyEnvName: "DASHSCOPE_API_KEY",
        region: "cn-beijing",
        isBuiltIn: true,
        isEnabledByDefault: false,
        presetVersion: "unit",
        lastUpdatedAt: new Date()
      }
    });
    const providerInstance = await prisma.aiProviderInstance.create({
      data: {
        providerPresetId: providerPreset.id,
        name: "单元测试语音模型管理实例",
        baseUrl: providerPreset.defaultBaseUrl,
        webSocketUrl: providerPreset.defaultWebSocketUrl,
        region: "cn-beijing",
        status: "ENABLED"
      }
    });
    const modelInstance = await prisma.aiModelInstance.create({
      data: {
        providerInstanceId: providerInstance.id,
        displayName: "单元测试可禁用 TTS 模型",
        providerModelName: `cosyvoice-admin-${unique}`,
        capabilityTags: ["AUDIO", "TTS"],
        isEnabled: true
      }
    });
    const user = await prisma.user.create({
      data: {
        email: `audio-model-admin-${unique}@example.com`,
        passwordHash: await hashPassword("Unit123456"),
        nickname: "语音模型管理测试用户",
        wallet: {
          create: {
            availableCredits: 30
          }
        }
      }
    });

    try {
      const listed = await audioService.listAdminAudioModels();
      assert.equal(listed.some((model) => model.id === modelInstance.id), true);

      const updated = await audioService.updateAdminAudioModel(modelInstance.id, {
        isEnabled: false,
        aliasKey: "tts-fast",
        aliasDisplayName: "单元测试快速语音模型",
        aliasDescription: "用于验证后台语音模型启停"
      });

      assert.equal(updated.isEnabled, false);
      assert.equal(updated.aliases.some((alias) => alias.aliasKey === "tts-fast"), true);

      await assert.rejects(
        () =>
          audioService.createTtsTask(user.id, {
            text: "模型禁用后不能创建任务",
            modelAlias: "tts-fast",
            voice: "longxiaochun",
            execute: false
          }),
        (error: unknown) => error instanceof Error && error.message === "模型别名 tts-fast 对应模型未启用"
      );
    } finally {
      if (previousAlias) {
        await prisma.aiModelAlias.update({
          where: {
            aliasKey: "tts-fast"
          },
          data: {
            displayName: previousAlias.displayName,
            description: previousAlias.description,
            modelInstanceId: previousAlias.modelInstanceId
          }
        });
      } else {
        await prisma.aiModelAlias.deleteMany({
          where: {
            aliasKey: "tts-fast"
          }
        });
      }
    }
  });

  await t.test("语音计费规则驱动预估、成功结算和用量日志", async () => {
    const providerPreset = await prisma.aiProviderPreset.create({
      data: {
        providerKey: `audio-billing-${unique}`,
        displayName: "单元测试语音计费 Provider",
        adapterType: "DASHSCOPE_AUDIO",
        modality: "AUDIO",
        defaultBaseUrl: "https://dashscope.aliyuncs.com/api/v1",
        defaultWebSocketUrl: "wss://dashscope.aliyuncs.com/api-ws/v1/inference",
        apiKeyEnvName: "DASHSCOPE_API_KEY",
        region: "cn-beijing",
        isBuiltIn: true,
        isEnabledByDefault: false,
        presetVersion: "unit",
        lastUpdatedAt: new Date()
      }
    });
    const providerInstance = await prisma.aiProviderInstance.create({
      data: {
        providerPresetId: providerPreset.id,
        name: "单元测试语音计费实例",
        baseUrl: providerPreset.defaultBaseUrl,
        webSocketUrl: providerPreset.defaultWebSocketUrl,
        region: "cn-beijing",
        status: "ENABLED"
      }
    });
    const modelName = `cosyvoice-billing-${unique}`;
    const modelInstance = await prisma.aiModelInstance.create({
      data: {
        providerInstanceId: providerInstance.id,
        displayName: "单元测试 TTS 计费模型",
        providerModelName: modelName,
        capabilityTags: ["AUDIO", "TTS"],
        isEnabled: true
      }
    });
    await prisma.audioPricingRule.create({
      data: {
        operationType: "TTS",
        model: modelName,
        billingMode: "PER_CHARACTER",
        creditsPerUnit: 7,
        minimumCredits: 7,
        modelMultiplier: 2,
        isEnabled: true
      }
    });
    const alias = await prisma.aiModelAlias.create({
      data: {
        aliasKey: `tts-billing-${unique}`,
        displayName: "单元测试语音计费别名",
        modelInstanceId: modelInstance.id
      }
    });
    const user = await prisma.user.create({
      data: {
        email: `audio-billing-${unique}@example.com`,
        passwordHash: await hashPassword("Unit123456"),
        nickname: "语音计费单元测试用户",
        wallet: {
          create: {
            availableCredits: 30
          }
        }
      }
    });
    const text = "测".repeat(101);
    const task = await audioService.createTtsTask(user.id, {
      text,
      modelAlias: alias.aliasKey,
      voice: "longxiaochun",
      execute: false
    });
    let wallet = await prisma.wallet.findUniqueOrThrow({
      where: {
        userId: user.id
      }
    });

    assert.equal(task.status, "RESERVED");
    assert.equal(task.estimatedCredits, 28);
    assert.equal(wallet.availableCredits, 2);
    assert.equal(wallet.frozenCredits, 28);

    const audioTaskSettler = audioService as unknown as {
      settleSuccessfulAudioTask(
        taskId: string,
        providerPayload: Record<string, unknown>
      ): Promise<{
        status: string;
        actualCredits: number | null;
        requestId: string | null;
        outputAudioAssetId: string | null;
      }>;
    };
    const settledTask = await audioTaskSettler.settleSuccessfulAudioTask(task.id, {
      audioUrl: "https://example.com/unit-audio.mp3",
      requestId: `audio-request-${unique}`,
      latencyMs: 321,
      audioDurationMs: 1500,
      estimatedCost: 0.0123
    });
    wallet = await prisma.wallet.findUniqueOrThrow({
      where: {
        userId: user.id
      }
    });

    assert.equal(settledTask.status, "SUCCEEDED");
    assert.equal(settledTask.actualCredits, 28);
    assert.equal(settledTask.requestId, `audio-request-${unique}`);
    assert.equal(typeof settledTask.outputAudioAssetId, "string");
    assert.equal(wallet.availableCredits, 2);
    assert.equal(wallet.frozenCredits, 0);
    assert.equal(wallet.totalConsumedCredits, 28);

    const usageLog = await prisma.audioUsageLog.findUniqueOrThrow({
      where: {
        taskId: task.id
      }
    });
    const consumeLedgers = await prisma.ledgerEntry.findMany({
      where: {
        relatedAudioTaskId: task.id,
        type: "CONSUME"
      }
    });

    assert.equal(usageLog.success, true);
    assert.equal(usageLog.consumedCredits, 28);
    assert.equal(usageLog.characterCount, text.length);
    assert.equal(usageLog.audioDurationMs, 1500);
    assert.equal(usageLog.providerRequestId, `audio-request-${unique}`);
    assert.equal(consumeLedgers.length, 1);
    assert.equal(consumeLedgers[0]?.relatedTaskType, "AUDIO");
    assert.equal(consumeLedgers[0]?.operationType, "TTS");

    await audioTaskSettler.settleSuccessfulAudioTask(task.id, {
      audioUrl: "https://example.com/unit-audio-again.mp3",
      requestId: `audio-request-again-${unique}`
    });

    assert.equal(
      await prisma.ledgerEntry.count({
        where: {
          relatedAudioTaskId: task.id,
          type: "CONSUME"
        }
      }),
      1
    );
    assert.equal(
      await prisma.audioUsageLog.count({
        where: {
          taskId: task.id
        }
      }),
      1
    );

    const dashboard = await audioService.getUsageDashboard({
      operationType: "TTS",
      model: modelName
    });

    assert.equal(dashboard.total.requestCount, 1);
    assert.equal(dashboard.total.consumedCredits, 28);
    assert.equal(dashboard.byOperation[0]?.id, "TTS");
    assert.equal(dashboard.byModel[0]?.id, modelName);
    assert.equal(dashboard.byUser[0]?.id, user.id);
    assert.equal(dashboard.byStatus[0]?.id, "SUCCEEDED");
  });

  await t.test("待审核音色不可合成，管理员审核与禁用会更新状态", async () => {
    const admin = await prisma.adminUser.create({
      data: {
        email: `audio-review-admin-${unique}@example.com`,
        passwordHash: await hashPassword("Unit123456"),
        name: "语音审核管理员",
        role: "SUPER_ADMIN",
        status: "ACTIVE"
      }
    });
    const providerPreset = await prisma.aiProviderPreset.create({
      data: {
        providerKey: `audio-review-${unique}`,
        displayName: "单元测试语音审核 Provider",
        adapterType: "DASHSCOPE_AUDIO",
        modality: "AUDIO",
        defaultBaseUrl: "https://dashscope.aliyuncs.com/api/v1",
        defaultWebSocketUrl: "wss://dashscope.aliyuncs.com/api-ws/v1/inference",
        apiKeyEnvName: "DASHSCOPE_API_KEY",
        region: "cn-beijing",
        isBuiltIn: true,
        isEnabledByDefault: false,
        presetVersion: "unit",
        lastUpdatedAt: new Date()
      }
    });
    const providerInstance = await prisma.aiProviderInstance.create({
      data: {
        providerPresetId: providerPreset.id,
        name: "单元测试语音审核实例",
        baseUrl: providerPreset.defaultBaseUrl,
        webSocketUrl: providerPreset.defaultWebSocketUrl,
        region: "cn-beijing",
        status: "ENABLED"
      }
    });
    const modelName = `cosyvoice-review-${unique}`;
    const modelInstance = await prisma.aiModelInstance.create({
      data: {
        providerInstanceId: providerInstance.id,
        displayName: "单元测试 TTS 审核模型",
        providerModelName: modelName,
        capabilityTags: ["AUDIO", "TTS", "CUSTOM_VOICE"],
        isEnabled: true
      }
    });
    await prisma.audioPricingRule.create({
      data: {
        operationType: "TTS",
        model: modelName,
        billingMode: "PER_CHARACTER",
        creditsPerUnit: 5,
        minimumCredits: 5,
        modelMultiplier: 1,
        isEnabled: true
      }
    });
    const alias = await prisma.aiModelAlias.create({
      data: {
        aliasKey: `tts-review-${unique}`,
        displayName: "单元测试审核别名",
        modelInstanceId: modelInstance.id
      }
    });
    const user = await prisma.user.create({
      data: {
        email: `audio-review-${unique}@example.com`,
        passwordHash: await hashPassword("Unit123456"),
        nickname: "语音审核单元测试用户",
        wallet: {
          create: {
            availableCredits: 30
          }
        }
      }
    });
    const sample = await prisma.audioAsset.create({
      data: {
        userId: user.id,
        type: "SOURCE_SAMPLE",
        storageProvider: "LOCAL",
        url: "https://example.com/source.wav",
        objectKey: `source-${unique}.wav`,
        mimeType: "audio/wav",
        sizeBytes: 1024
      }
    });
    const voice = await prisma.voiceAsset.create({
      data: {
        userId: user.id,
        provider: providerPreset.providerKey,
        providerInstanceId: providerInstance.id,
        providerVoiceId: `voice-${unique}`,
        name: "待审核音色",
        type: "CLONED",
        targetModel: modelName,
        status: "PENDING_REVIEW",
        visibility: "PRIVATE",
        sourceAudioAssetId: sample.id
      }
    });
    const consent = await prisma.voiceConsent.create({
      data: {
        userId: user.id,
        voiceAssetId: voice.id,
        sourceAudioAssetId: sample.id,
        statement: "我确认上传的音频为本人声音。",
        consentText: "我确认上传的音频为本人声音。",
        consentType: "SELF_VOICE",
        agreedAt: new Date(),
        ip: "127.0.0.1",
        userAgent: "node-test"
      }
    });
    await prisma.voiceAsset.update({
      where: {
        id: voice.id
      },
      data: {
        consentId: consent.id
      }
    });

    await assert.rejects(
      () =>
        audioService.createTtsTask(user.id, {
          text: "审核通过前不能使用",
          modelAlias: alias.aliasKey,
          voiceAssetId: voice.id,
          execute: false
        }),
      (error: unknown) => error instanceof Error && error.message === "该音色尚未就绪，不能用于语音合成"
    );

    const approved = await audioService.reviewVoiceAsset(voice.id, {
      action: "APPROVE",
      reason: "授权记录完整"
    }, admin.id);
    const adminVoice = await audioService.getAdminVoiceAsset(voice.id);

    assert.equal(approved.status, "READY");
    assert.equal(approved.consent?.consentText, "我确认上传的音频为本人声音。");
    assert.equal(adminVoice.sourceAudioAsset?.url, null);
    assert.equal(adminVoice.sourceSampleFilePath, `/admin/audio/assets/${sample.id}/file`);

    const task = await audioService.createTtsTask(user.id, {
      text: "审核通过后可以使用",
      modelAlias: alias.aliasKey,
      voiceAssetId: voice.id,
      execute: false
    });
    const adminTasks = await audioService.listAdminTasks({
      user: user.email,
      status: "RESERVED",
      type: "TTS"
    });

    assert.equal(task.status, "RESERVED");
    assert.equal(task.voiceConsent?.id, consent.id);
    assert.equal(adminTasks.some((adminTask) => adminTask.id === task.id), true);

    await audioService.setDefaultVoice(user.id, {
      voiceAssetId: voice.id
    });
    const disabled = await audioService.reviewVoiceAsset(voice.id, {
      action: "DISABLE",
      reason: "测试违规处理"
    }, admin.id);
    const preference = await prisma.userAudioPreference.findUniqueOrThrow({
      where: {
        userId: user.id
      }
    });

    assert.equal(disabled.status, "DISABLED");
    assert.equal(disabled.disabledReason, "测试违规处理");
    assert.equal(preference.defaultVoiceAssetId, null);
  });
});
