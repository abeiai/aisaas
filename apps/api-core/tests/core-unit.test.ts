import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

process.env.JWT_ACCESS_SECRET ??= `test-access-${randomUUID()}`;
process.env.JWT_REFRESH_SECRET ??= `test-refresh-${randomUUID()}`;
process.env.SECRET_ENCRYPTION_KEY ??= `test-secret-${randomUUID()}-${randomUUID()}`;
process.env.ENABLE_MOCK_PAYMENT_NOTIFY ??= "1";
delete process.env.ALIYUN_SMS_ACCESS_KEY_ID;
delete process.env.ALIYUN_SMS_ACCESS_KEY_SECRET;
delete process.env.ALIYUN_SMS_SIGN_NAME;
delete process.env.ALIYUN_SMS_TEMPLATE_CODE;

const unique = `unit-${Date.now()}`;
const phoneSuffix = String(Date.now()).slice(-8);

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
  const { OrganizationsService } = await import("../src/organizations/organizations.service.js");

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
    AdminUsersService,
    OrganizationsService
  };
}

test("核心业务单元测试", { timeout: 120_000 }, async (t) => {
  const {
    getPrismaClient,
    encryptSecret,
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
    AdminUsersService,
    OrganizationsService
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
  const organizationsService = new OrganizationsService();
  const audioService = new AudioService(organizationsService);
  const adminUsersService = new AdminUsersService();
  const smsEnabledConfigSnapshot = await prisma.systemConfig.findUnique({
    where: {
      key: "smsVerificationEnabled"
    }
  });

  await prisma.systemConfig.upsert({
    where: {
      key: "smsVerificationEnabled"
    },
    update: {
      value: "false"
    },
    create: {
      key: "smsVerificationEnabled",
      label: "短信验证启用",
      value: "false",
      description: "测试期间关闭正式短信通道，避免本地配置影响默认验证码用例。",
      group: "send",
      isPublic: false,
      sortOrder: 140
    }
  });

  await t.after(async () => {
    if (smsEnabledConfigSnapshot) {
      await prisma.systemConfig.update({
        where: {
          key: "smsVerificationEnabled"
        },
        data: {
          value: smsEnabledConfigSnapshot.value
        }
      });
    } else {
      await prisma.systemConfig.deleteMany({
        where: {
          key: "smsVerificationEnabled"
        }
      });
    }
  });

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
    await prisma.smsVerificationCode.deleteMany({
      where: {
        phone: {
          contains: phoneSuffix
        }
      }
    });
    await prisma.organization.deleteMany({
      where: {
        owner: {
          email: {
            contains: unique
          }
        }
      }
    });
    await prisma.user.deleteMany({
      where: {
        OR: [
          {
            email: {
              contains: unique
            }
          },
          {
            phone: {
              contains: phoneSuffix
            }
          }
        ]
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
    await prisma.loginFailure.deleteMany({
      where: {
        subject: {
          contains: phoneSuffix
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

  await t.test("手机号验证码可创建用户并登录", async () => {
    const phone = `139${phoneSuffix}`;

    const codeResult = await authService.sendPhoneCode({
      phone,
      purpose: "LOGIN"
    });
    const session = await authService.loginByPhone(
      {
        phone,
        code: "199599",
        nickname: "手机号单测用户"
      },
      responseMock()
    );
    const createdUser = await prisma.user.findUnique({
      where: {
        phone
      },
      include: {
        wallet: true
      }
    });

    assert.equal(codeResult.phone, phone);
    assert.equal(session.user.phone, phone);
    assert.equal(session.user.nickname, "手机号单测用户");
    assert.ok(session.accessToken);
    assert.ok(createdUser?.wallet);
  });

  await t.test("邮箱注册用户可以绑定手机号", async () => {
    const phone = `138${phoneSuffix}`;
    const user = await prisma.user.create({
      data: {
        email: `bind-phone-${unique}@example.com`,
        passwordHash: await hashPassword("Unit123456"),
        nickname: "绑定手机号用户",
        wallet: {
          create: {}
        }
      }
    });

    await authService.sendPhoneCode(
      {
        phone,
        purpose: "BIND_PHONE"
      },
      user.id
    );
    const boundUser = await authService.bindPhone(user.id, {
      phone,
      code: "199599"
    });

    assert.equal(boundUser.phone, phone);
    assert.ok(boundUser.phoneVerifiedAt);
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

  await t.test("用户和管理员可通过 refresh cookie 保持登录", async () => {
    const userPassword = "Unit123456";
    const user = await prisma.user.create({
      data: {
        email: `persistent-user-${unique}@example.com`,
        passwordHash: await hashPassword(userPassword),
        nickname: "长期登录用户",
        wallet: {
          create: {}
        }
      }
    });
    const adminPassword = "Admin123456";
    const admin = await prisma.adminUser.create({
      data: {
        email: `persistent-admin-${unique}@example.com`,
        passwordHash: await hashPassword(adminPassword),
        name: "长期登录管理员",
        role: "SUPER_ADMIN",
        status: "ACTIVE"
      }
    });

    const userSession = await authService.login(
      {
        email: user.email,
        password: userPassword
      },
      responseMock()
    );
    const adminSession = await adminAuthService.login(
      {
        email: admin.email,
        password: adminPassword
      },
      responseMock()
    );

    const userFromRefresh = await authService.me({
      headers: {
        cookie: `aisaas_user_refresh=${encodeURIComponent(userSession.refreshToken)}`
      }
    });
    const refreshedUserSession = await authService.refresh(
      {
        headers: {
          cookie: `aisaas_user_refresh=${encodeURIComponent(userSession.refreshToken)}`
        }
      },
      responseMock()
    );
    const adminFromRefresh = await adminAuthService.me({
      headers: {
        cookie: `aisaas_admin_refresh=${encodeURIComponent(adminSession.refreshToken)}`
      }
    });
    const refreshedAdminSession = await adminAuthService.refresh(
      {
        headers: {
          cookie: `aisaas_admin_refresh=${encodeURIComponent(adminSession.refreshToken)}`
        }
      },
      responseMock()
    );

    assert.equal(userFromRefresh.id, user.id);
    assert.equal(adminFromRefresh.id, admin.id);
    assert.equal(refreshedUserSession.user.id, user.id);
    assert.equal(refreshedAdminSession.admin.id, admin.id);
    assert.ok(refreshedUserSession.accessToken);
    assert.ok(refreshedAdminSession.accessToken);
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
    assert.equal(resolvePaymentProduct("ALIPAY", "DESKTOP_WEB"), "ALIPAY_PRECREATE");
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
        usage: {
          inputTokens: 100_000,
          outputTokens: 10_000,
          totalTokens: 110_000
        },
        inputPrice: 0,
        outputPrice: 0,
        pricingConfig: {
          mode: "TOKEN_TIERED",
          currency: "CNY",
          unit: "M_TOKENS",
          tierBasis: "REQUEST_INPUT_TOKENS",
          tiers: [
            {
              label: "默认",
              minInputTokens: 0,
              maxInputTokens: null,
              input: 2,
              output: 12
            }
          ]
        },
        fallbackCredits: 120,
        maxCredits: 120
      }),
      32
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

  await t.test("AI 模型实例删除前会校验场景绑定", async () => {
    const providerPreset = await prisma.aiProviderPreset.create({
      data: {
        providerKey: `delete-check-${unique}`,
        displayName: "删除检查 Provider",
        adapterType: "OPENAI_COMPATIBLE",
        modality: "TEXT",
        defaultBaseUrl: "https://api.example.com/v1",
        apiKeyEnvName: "TEST_API_KEY",
        isBuiltIn: false,
        presetVersion: "test",
        lastUpdatedAt: new Date()
      }
    });
    const modelPreset = await prisma.aiModelPreset.create({
      data: {
        providerPresetId: providerPreset.id,
        modelKey: `delete-check-model-${unique}`,
        displayName: "删除检查模型",
        providerModelName: `delete-check-model-${unique}`,
        capabilityTags: ["TEXT"],
        supportsStreaming: true
      }
    });
    const providerInstance = await prisma.aiProviderInstance.create({
      data: {
        providerPresetId: providerPreset.id,
        name: "删除检查实例",
        baseUrl: "https://api.example.com/v1",
        status: "ENABLED"
      }
    });
    const modelInstance = await prisma.aiModelInstance.create({
      data: {
        providerInstanceId: providerInstance.id,
        modelPresetId: modelPreset.id,
        displayName: "删除检查实例模型",
        providerModelName: `delete-check-instance-${unique}`,
        capabilityTags: ["TEXT"],
        inputPrice: "1",
        outputPrice: "4",
        pricingMode: "TOKENS",
        pricingUnit: "K_TOKENS",
        isEnabled: true
      }
    });
    const alias = await prisma.aiModelAlias.create({
      data: {
        aliasKey: `delete-check-alias-${unique}`,
        displayName: "删除检查别名",
        modelInstanceId: modelInstance.id
      }
    });
    const scenario = await prisma.aiScenario.create({
      data: {
        name: "删除检查场景",
        slug: `delete-check-scenario-${unique}`,
        promptTemplate: "{input}",
        promptVariables: [],
        requiredCapabilities: ["TEXT"],
        costCredits: 1,
        isEnabled: true,
        modelBinding: {
          create: {
            defaultModelAlias: alias.aliasKey
          }
        }
      }
    });

    const blocked = await aiService.checkModelInstanceDelete(modelInstance.id);
    assert.equal(blocked.canDelete, false);
    assert.equal(blocked.boundScenarios[0]?.slug, scenario.slug);
    await assert.rejects(() => aiService.deleteModelInstance(modelInstance.id), /请先解除模型别名绑定/);

    await prisma.aiScenario.delete({
      where: {
        id: scenario.id
      }
    });

    const allowed = await aiService.checkModelInstanceDelete(modelInstance.id);
    assert.equal(allowed.canDelete, true);
    await aiService.deleteModelInstance(modelInstance.id);
    const aliasAfterDelete = await prisma.aiModelAlias.findUniqueOrThrow({
      where: {
        id: alias.id
      }
    });

    assert.equal(aliasAfterDelete.modelInstanceId, null);
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

    const recharged = await adminUsersService.rechargeCredits(user.id, {
      amount: 120,
      reasonType: "REWARD"
    });
    assert.equal(recharged.wallet.availableCredits, 190);
    assert.equal(recharged.wallet.totalTopUpCredits, 120);
    assert.equal(recharged.ledgerEntry.type, "TOP_UP");
    assert.equal(recharged.ledgerEntry.amount, 120);
    assert.equal(recharged.ledgerEntry.note, "管理员充值：奖励");

    const detail = await adminUsersService.getUserDetail(user.id);
    assert.ok(detail.rechargeRecords.some((entry) => entry.id === recharged.ledgerEntry.id));
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

  await t.test("体验区 AI 对话完成后按实际点数结算", async () => {
    const user = await prisma.user.create({
      data: {
        email: `ai-chat-billing-${unique}@example.com`,
        passwordHash: await hashPassword("Unit123456"),
        nickname: "AI 对话扣点单元测试用户",
        wallet: {
          create: {
            availableCredits: 100
          }
        }
      }
    });
    const streamEvents: Record<string, unknown>[] = [];

    const task = await aiService.createChatStream(
      user.id,
      {
        input: "你好，请介绍本系统",
        modelInstanceId: "mock",
        messages: []
      },
      (event) => streamEvents.push(event)
    );

    const actualCredits = task.actualCredits ?? 0;
    const doneEvent = streamEvents.find((event) => event.type === "done") as
      | {
          task?: {
            actualCredits?: number | null;
          };
        }
      | undefined;
    const wallet = await prisma.wallet.findUniqueOrThrow({
      where: {
        userId: user.id
      }
    });
    const consumeLedger = await prisma.ledgerEntry.findFirst({
      where: {
        relatedTaskId: task.id,
        type: "CONSUME"
      }
    });

    assert.equal(task.status, "SUCCEEDED");
    assert.ok(actualCredits > 0);
    assert.equal(doneEvent?.task?.actualCredits, actualCredits);
    assert.equal(wallet.availableCredits, 100 - actualCredits);
    assert.equal(wallet.frozenCredits, 0);
    assert.equal(wallet.totalConsumedCredits, actualCredits);
    assert.equal(consumeLedger?.amount, -actualCredits);
  });

  await t.test("体验区图片生成会写入后台图片任务清单", async () => {
    const user = await prisma.user.create({
      data: {
        email: `ai-image-task-${unique}@example.com`,
        passwordHash: await hashPassword("Unit123456"),
        nickname: "图片生成任务单元测试用户",
        wallet: {
          create: {
            availableCredits: 100
          }
        }
      }
    });
    const providerPreset = await prisma.aiProviderPreset.create({
      data: {
        providerKey: `image-provider-${unique}`,
        displayName: "图片生成测试 Provider",
        adapterType: "OPENAI_COMPATIBLE",
        modality: "MULTIMODAL",
        defaultBaseUrl: "https://dashscope.aliyuncs.com/api/v1",
        apiKeyEnvName: "TEST_IMAGE_API_KEY",
        isBuiltIn: false,
        presetVersion: "test",
        lastUpdatedAt: new Date()
      }
    });
    const providerInstance = await prisma.aiProviderInstance.create({
      data: {
        providerPresetId: providerPreset.id,
        name: `图片生成测试实例 ${unique}`,
        baseUrl: "https://dashscope.aliyuncs.com/api/v1",
        status: "ENABLED",
        credential: {
          create: {
            apiKeyEncrypted: encryptSecret("sk-unit-image")
          }
        }
      }
    });
    const modelInstance = await prisma.aiModelInstance.create({
      data: {
        providerInstanceId: providerInstance.id,
        displayName: "图片生成测试模型",
        providerModelName: "qwen-image-2.0",
        capabilityTags: ["IMAGE_GENERATION"],
        inputPrice: "0.01",
        outputPrice: "0",
        pricingMode: "IMAGES",
        pricingUnit: "IMAGE",
        isEnabled: true
      }
    });
    const imageService = aiService as unknown as {
      callDashScopeImageGeneration(input: unknown): Promise<Record<string, unknown>>;
    };
    const originalCall = imageService.callDashScopeImageGeneration;

    imageService.callDashScopeImageGeneration = async () => ({
      request_id: `image-request-${unique}`,
      output: {
        results: [
          {
            url: "https://example.com/unit-image.png"
          }
        ]
      }
    });

    try {
      const result = await aiService.generateImage(user.id, {
        prompt: "生成一张单元测试图片",
        modelInstanceId: modelInstance.id,
        width: 1024,
        height: 1024,
        count: 1
      });
      const task = await prisma.aiTask.findUniqueOrThrow({
        where: {
          id: result.id
        },
        include: {
          scenario: true,
          reservation: true,
          callLogs: true
        }
      });
      const wallet = await prisma.wallet.findUniqueOrThrow({
        where: {
          userId: user.id
        }
      });
      const adminImageTasks = await aiService.listAdminTasks({
        taskType: "IMAGE",
        model: modelInstance.id,
        user: user.email,
        page: "1",
        pageSize: "50"
      });

      assert.equal(task.status, "SUCCEEDED");
      assert.deepEqual(task.scenario.requiredCapabilities, ["IMAGE_GENERATION"]);
      assert.equal(task.estimatedCredits, 1);
      assert.equal(task.actualCredits, 1);
      assert.equal(task.reservation?.amount, 1);
      assert.equal(task.callLogs[0]?.success, true);
      assert.match(task.outputPreview ?? "", /unit-image\.png/);
      assert.equal(wallet.availableCredits, 99);
      assert.equal(wallet.totalConsumedCredits, 1);
      assert.equal(adminImageTasks.some((item) => item.id === result.id), true);
    } finally {
      imageService.callDashScopeImageGeneration = originalCall;
    }
  });

  await t.test("体验区视频生成会写入后台视频任务清单并在轮询完成后结算", async () => {
    const user = await prisma.user.create({
      data: {
        email: `ai-video-task-${unique}@example.com`,
        passwordHash: await hashPassword("Unit123456"),
        nickname: "视频生成任务单元测试用户",
        wallet: {
          create: {
            availableCredits: 200
          }
        }
      }
    });
    const providerPreset = await prisma.aiProviderPreset.create({
      data: {
        providerKey: `video-provider-${unique}`,
        displayName: "视频生成测试 Provider",
        adapterType: "OPENAI_COMPATIBLE",
        modality: "MULTIMODAL",
        defaultBaseUrl: "https://dashscope.aliyuncs.com/api/v1",
        apiKeyEnvName: "TEST_VIDEO_API_KEY",
        isBuiltIn: false,
        presetVersion: "test",
        lastUpdatedAt: new Date()
      }
    });
    const providerInstance = await prisma.aiProviderInstance.create({
      data: {
        providerPresetId: providerPreset.id,
        name: `视频生成测试实例 ${unique}`,
        baseUrl: "https://dashscope.aliyuncs.com/api/v1",
        status: "ENABLED",
        credential: {
          create: {
            apiKeyEncrypted: encryptSecret("sk-unit-video")
          }
        }
      }
    });
    const modelInstance = await prisma.aiModelInstance.create({
      data: {
        providerInstanceId: providerInstance.id,
        displayName: "视频生成测试模型",
        providerModelName: "wan2.7-t2v",
        capabilityTags: ["VIDEO_GENERATION", "TEXT_TO_VIDEO"],
        inputPrice: "0.02",
        outputPrice: "0",
        pricingMode: "VIDEO_SECONDS",
        pricingUnit: "SECOND",
        isEnabled: true
      }
    });
    const providerTaskId = `video-task-${unique}`;
    const videoService = aiService as unknown as {
      callDashScopeVideoGeneration(input: unknown): Promise<Record<string, unknown>>;
      queryDashScopeVideoTask(input: unknown): Promise<Record<string, unknown>>;
    };
    const originalCreate = videoService.callDashScopeVideoGeneration;
    const originalQuery = videoService.queryDashScopeVideoTask;

    videoService.callDashScopeVideoGeneration = async () => ({
      request_id: `video-submit-${unique}`,
      output: {
        task_id: providerTaskId,
        task_status: "RUNNING"
      }
    });
    videoService.queryDashScopeVideoTask = async () => ({
      request_id: `video-query-${unique}`,
      output: {
        task_id: providerTaskId,
        task_status: "SUCCEEDED",
        video_url: "https://example.com/unit-video.mp4"
      }
    });

    try {
      const result = await aiService.generateVideo(user.id, {
        prompt: "生成一段单元测试视频",
        modelInstanceId: modelInstance.id,
        ratio: "16:9",
        resolution: "高清 720P",
        duration: 5
      });
      const runningTask = await prisma.aiTask.findUniqueOrThrow({
        where: {
          id: result.id
        },
        include: {
          scenario: true,
          reservation: true,
          callLogs: true
        }
      });
      const adminVideoTasks = await aiService.listAdminTasks({
        taskType: "VIDEO",
        model: modelInstance.id,
        user: user.email,
        page: "1",
        pageSize: "50"
      });

      assert.equal(result.providerTaskId, providerTaskId);
      assert.equal(runningTask.status, "RUNNING");
      assert.deepEqual(runningTask.scenario.requiredCapabilities, ["VIDEO_GENERATION"]);
      assert.equal(runningTask.estimatedCredits, 10);
      assert.equal(runningTask.reservation?.amount, 10);
      assert.match(runningTask.outputPreview ?? "", new RegExp(providerTaskId));
      assert.equal(runningTask.callLogs[0]?.success, true);
      assert.equal(adminVideoTasks.some((item) => item.id === result.id), true);

      const completed = await aiService.getVideoGenerationTask(user.id, providerTaskId, modelInstance.id);
      const settledTask = await prisma.aiTask.findUniqueOrThrow({
        where: {
          id: result.id
        }
      });
      const wallet = await prisma.wallet.findUniqueOrThrow({
        where: {
          userId: user.id
        }
      });

      assert.equal(completed.status, "SUCCEEDED");
      assert.equal(completed.videoUrl, "https://example.com/unit-video.mp4");
      assert.equal(settledTask.status, "SUCCEEDED");
      assert.equal(settledTask.actualCredits, 10);
      assert.equal(wallet.availableCredits, 190);
      assert.equal(wallet.totalConsumedCredits, 10);
    } finally {
      videoService.callDashScopeVideoGeneration = originalCreate;
      videoService.queryDashScopeVideoTask = originalQuery;
    }
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
        inputPrice: "0.05",
        outputPrice: "0",
        pricingMode: "REQUEST",
        pricingUnit: "REQUEST",
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
        inputPrice: "1",
        outputPrice: "0",
        pricingMode: "CHARACTERS",
        pricingUnit: "TEN_K_CHARACTERS",
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
        displayName: "单元测试已编辑 TTS 模型",
        modelName: `cosyvoice-admin-edited-${unique}`,
        capabilityTags: ["AUDIO", "TTS"],
        inputPrice: 0.8,
        outputPrice: 0,
        pricingMode: "CHARACTERS",
        pricingUnit: "TEN_K_CHARACTERS",
        isEnabled: false,
        aliasKey: "tts-fast",
        aliasDisplayName: "单元测试快速语音模型",
        aliasDescription: "用于验证后台语音模型启停"
      });

      assert.equal(updated.isEnabled, false);
      assert.equal(updated.displayName, "单元测试已编辑 TTS 模型");
      assert.equal(updated.modelName, `cosyvoice-admin-edited-${unique}`);
      assert.equal(updated.pricingMode, "CHARACTERS");
      assert.equal(updated.pricingUnit, "TEN_K_CHARACTERS");
      assert.equal(updated.inputPrice, "0.8");
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

      const scenario = await prisma.aiScenario.create({
        data: {
          slug: `audio-model-delete-${unique}`,
          name: "语音模型删除检查场景",
          promptTemplate: "测试语音模型删除检查：{input}",
          promptVariables: [],
          costCredits: 1,
          isEnabled: true
        }
      });
      await prisma.aiScenarioModelBinding.create({
        data: {
          scenarioId: scenario.id,
          defaultModelAlias: "tts-fast"
        }
      });
      const blockedDelete = await audioService.checkAdminAudioModelDelete(modelInstance.id);

      assert.equal(blockedDelete.canDelete, false);
      assert.equal(blockedDelete.boundScenarios.some((item) => item.slug === scenario.slug), true);
      await assert.rejects(
        () => audioService.deleteAdminAudioModel(modelInstance.id),
        (error: unknown) =>
          error instanceof Error && error.message.includes("请先解除模型别名绑定后再删除")
      );

      await prisma.aiScenarioModelBinding.deleteMany({
        where: {
          scenarioId: scenario.id
        }
      });
      const deletableModel = await prisma.aiModelInstance.create({
        data: {
          providerInstanceId: providerInstance.id,
          displayName: "单元测试可删除 TTS 模型",
          providerModelName: `cosyvoice-deletable-${unique}`,
          capabilityTags: ["AUDIO", "TTS"],
          isEnabled: true
        }
      });
      const allowedDelete = await audioService.checkAdminAudioModelDelete(deletableModel.id);
      const deleted = await audioService.deleteAdminAudioModel(deletableModel.id);

      assert.equal(allowedDelete.canDelete, true);
      assert.equal(deleted.deleted, true);
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

  await t.test("语音合成按模型价格预估并按 Provider 字符数结算", async () => {
    const providerPreset = await prisma.aiProviderPreset.create({
      data: {
        providerKey: `audio-billing-${unique}`,
        displayName: "单元测试语音模型价格 Provider",
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
        name: "单元测试语音模型价格实例",
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
        inputPrice: "1",
        outputPrice: "0",
        pricingMode: "CHARACTERS",
        pricingUnit: "TEN_K_CHARACTERS",
        isEnabled: true
      }
    });
    const alias = await prisma.aiModelAlias.create({
      data: {
        aliasKey: `tts-billing-${unique}`,
        displayName: "单元测试语音模型价格别名",
        modelInstanceId: modelInstance.id
      }
    });
    const user = await prisma.user.create({
      data: {
        email: `audio-billing-${unique}@example.com`,
        passwordHash: await hashPassword("Unit123456"),
        nickname: "语音模型价格单元测试用户",
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
    assert.equal(task.estimatedCredits, 3);
    assert.equal(wallet.availableCredits, 27);
    assert.equal(wallet.frozenCredits, 3);

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
      estimatedCost: 0.0123,
      usage: {
        providerUsage: {
          characters: 620
        }
      }
    });
    wallet = await prisma.wallet.findUniqueOrThrow({
      where: {
        userId: user.id
      }
    });

    assert.equal(settledTask.status, "SUCCEEDED");
    assert.equal(settledTask.actualCredits, 7);
    assert.equal(settledTask.requestId, `audio-request-${unique}`);
    assert.equal(typeof settledTask.outputAudioAssetId, "string");
    assert.equal(wallet.availableCredits, 23);
    assert.equal(wallet.frozenCredits, 0);
    assert.equal(wallet.totalConsumedCredits, 7);

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
    assert.equal(usageLog.consumedCredits, 7);
    assert.equal(usageLog.characterCount, 620);
    assert.equal(usageLog.usageCount, 620);
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
    assert.equal(dashboard.total.consumedCredits, 7);
    assert.equal(dashboard.byOperation[0]?.id, "TTS");
    assert.equal(dashboard.byModel[0]?.id, modelName);
    assert.equal(dashboard.byUser[0]?.id, user.id);
    assert.equal(dashboard.byStatus[0]?.id, "SUCCEEDED");
  });

  await t.test("企业空间语音合成按企业钱包和成员额度结算", async () => {
    const previousEnterpriseConfig = await prisma.systemConfig.findUnique({
      where: {
        key: "enterpriseAccountEnabled"
      }
    });
    const providerPreset = await prisma.aiProviderPreset.create({
      data: {
        providerKey: `audio-enterprise-${unique}`,
        displayName: "单元测试企业语音 Provider",
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
        name: "单元测试企业语音实例",
        baseUrl: providerPreset.defaultBaseUrl,
        webSocketUrl: providerPreset.defaultWebSocketUrl,
        region: "cn-beijing",
        status: "ENABLED"
      }
    });
    const modelName = `cosyvoice-enterprise-${unique}`;
    const modelInstance = await prisma.aiModelInstance.create({
      data: {
        providerInstanceId: providerInstance.id,
        displayName: "单元测试企业 TTS 计费模型",
        providerModelName: modelName,
        capabilityTags: ["AUDIO", "TTS"],
        inputPrice: "1",
        outputPrice: "0",
        pricingMode: "CHARACTERS",
        pricingUnit: "TEN_K_CHARACTERS",
        isEnabled: true
      }
    });
    const alias = await prisma.aiModelAlias.create({
      data: {
        aliasKey: `tts-enterprise-${unique}`,
        displayName: "单元测试企业语音别名",
        modelInstanceId: modelInstance.id
      }
    });
    const user = await prisma.user.create({
      data: {
        email: `audio-enterprise-${unique}@example.com`,
        passwordHash: await hashPassword("Unit123456"),
        nickname: "企业语音单元测试用户"
      }
    });

    try {
      await prisma.systemConfig.upsert({
        where: {
          key: "enterpriseAccountEnabled"
        },
        update: {
          value: "true"
        },
        create: {
          key: "enterpriseAccountEnabled",
          label: "企业账号体系启用",
          value: "true",
          description: "单元测试启用企业账号体系。",
          group: "business",
          isPublic: false,
          sortOrder: 410
        }
      });

      const organization = await organizationsService.createOrganization(user.id, {
        name: `企业语音测试 ${unique}`
      });
      const memberId = organization.members[0]?.id;

      assert.ok(memberId);

      await organizationsService.adjustOrganizationCredits("unit-admin", organization.id, {
        amount: 30,
        reason: "单元测试企业充值"
      });
      await organizationsService.allocateQuota(user.id, organization.id, memberId, {
        totalQuota: 20,
        remark: "单元测试成员额度"
      });

      const task = await audioService.createTtsTask(user.id, {
        text: "测".repeat(101),
        modelAlias: alias.aliasKey,
        voice: "longxiaochun",
        execute: false,
        billingContext: "ORGANIZATION",
        organizationId: organization.id
      });
      let wallet = await prisma.organizationWallet.findUniqueOrThrow({
        where: {
          orgId: organization.id
        }
      });

      assert.equal(task.status, "RESERVED");
      assert.equal(task.billingContext, "ORGANIZATION");
      assert.equal(task.organizationId, organization.id);
      assert.equal(task.organizationMemberId, memberId);
      assert.equal(task.estimatedCredits, 3);
      assert.equal(wallet.balanceTotal, 30);
      assert.equal(wallet.balanceAvailable, 27);
      assert.equal(wallet.balanceReserved, 3);

      const audioTaskSettler = audioService as unknown as {
        settleSuccessfulAudioTask(
          taskId: string,
          providerPayload: Record<string, unknown>
        ): Promise<{
          status: string;
          actualCredits: number | null;
        }>;
      };
      const settledTask = await audioTaskSettler.settleSuccessfulAudioTask(task.id, {
        audioUrl: "https://example.com/unit-enterprise-audio.mp3",
        requestId: `audio-enterprise-request-${unique}`,
        usage: {
          providerUsage: {
            characters: 620
          }
        }
      });

      wallet = await prisma.organizationWallet.findUniqueOrThrow({
        where: {
          orgId: organization.id
        }
      });
      const quota = await prisma.organizationMemberQuota.findFirstOrThrow({
        where: {
          orgId: organization.id,
          memberId
        }
      });
      const usageEvent = await prisma.organizationUsageEvent.findFirstOrThrow({
        where: {
          resourceId: task.id
        }
      });
      const audioUsageLog = await prisma.audioUsageLog.findUniqueOrThrow({
        where: {
          taskId: task.id
        }
      });
      const quotaConsumeLedger = await prisma.organizationQuotaLedger.findFirstOrThrow({
        where: {
          sourceId: `audio-task:${task.id}`,
          direction: "CONSUME"
        }
      });

      assert.equal(settledTask.status, "SUCCEEDED");
      assert.equal(settledTask.actualCredits, 7);
      assert.equal(wallet.balanceTotal, 23);
      assert.equal(wallet.balanceAvailable, 23);
      assert.equal(wallet.balanceReserved, 0);
      assert.equal(wallet.totalConsumed, 7);
      assert.equal(quota.usedQuota, 7);
      assert.equal(quota.reservedQuota, 0);
      assert.equal(quota.totalQuota - quota.usedQuota - quota.reservedQuota, 13);
      assert.equal(usageEvent.featureCode, "audio.tts");
      assert.equal(usageEvent.pointsCharged, 7);
      assert.equal(Number(usageEvent.usageQuantity), 620);
      assert.equal(audioUsageLog.consumedCredits, 7);
      assert.equal(audioUsageLog.characterCount, 620);
      assert.equal(quotaConsumeLedger.quotaAfter, 13);
    } finally {
      if (previousEnterpriseConfig) {
        await prisma.systemConfig.update({
          where: {
            key: "enterpriseAccountEnabled"
          },
          data: {
            value: previousEnterpriseConfig.value
          }
        });
      } else {
        await prisma.systemConfig.deleteMany({
          where: {
            key: "enterpriseAccountEnabled"
          }
        });
      }
    }
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
        inputPrice: "1",
        outputPrice: "0",
        pricingMode: "CHARACTERS",
        pricingUnit: "TEN_K_CHARACTERS",
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
