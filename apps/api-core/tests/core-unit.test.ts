import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

process.env.JWT_ACCESS_SECRET ??= `test-access-${randomUUID()}`;
process.env.JWT_REFRESH_SECRET ??= `test-refresh-${randomUUID()}`;
process.env.SECRET_ENCRYPTION_KEY ??= `test-secret-${randomUUID()}-${randomUUID()}`;

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
  const { AiService } = await import("../src/ai/ai.service.js");
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
    AiService,
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
    AiService,
    calculateUsageCredits,
    AdminUsersService
  } = await loadModules();
  const prisma = getPrismaClient();
  const authService = new AuthService();
  const adminAuthService = new AdminAuthService();
  const publicContentService = new PublicContentService();
  const paymentService = new PaymentService(new AlipayClient(), new WechatPayClient());
  const aiService = new AiService();
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
});
