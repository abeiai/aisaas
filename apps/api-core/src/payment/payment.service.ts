import { randomBytes } from "node:crypto";
import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { getPrismaClient, type Prisma } from "@aisaas/database";
import { AppException } from "../common/app-exception.js";
import { CreatePaymentOrderDto } from "./dto/create-payment-order.dto.js";
import { AlipayClient } from "./alipay.client.js";
import { amountToCents, WechatPayClient } from "./wechat-pay.client.js";
import { PaymentConfigService } from "./payment-config.service.js";
import { detectPaymentScene, paymentProductName, paymentSceneName, resolvePaymentProduct } from "./payment-scene.js";
import { toInputJson } from "./payment-crypto.js";
import { getClientIp, getHeaderValue, getUserAgent, type HeaderRequestLike } from "../security/request-types.js";
import type {
  ChannelQueryResult,
  PaymentProduct,
  PaymentProvider,
  PaymentScene,
  VerifiedPaymentResult
} from "./payment-channel.types.js";

export { type PaymentProvider } from "./payment-channel.types.js";

export const creditPackages = [
  {
    code: "starter",
    name: "入门充值包",
    amountCny: "19.90",
    credits: 1990
  },
  {
    code: "growth",
    name: "增长充值包",
    amountCny: "49.90",
    credits: 5990
  },
  {
    code: "pro",
    name: "专业充值包",
    amountCny: "99.00",
    credits: 12900
  }
] as const;

type CreditPackage = (typeof creditPackages)[number];
type AvailablePaymentProduct = Awaited<ReturnType<PaymentConfigService["listAvailableProducts"]>>[number];

interface NotifyInput {
  provider: PaymentProvider;
  body: Record<string, unknown>;
  headers?: Record<string, unknown>;
  verified: VerifiedPaymentResult;
}

@Injectable()
export class PaymentService {
  private readonly prisma = getPrismaClient();

  constructor(
    @Inject(PaymentConfigService)
    private readonly paymentConfigService: PaymentConfigService,
    @Inject(AlipayClient)
    private readonly alipayClient: AlipayClient,
    @Inject(WechatPayClient)
    private readonly wechatPayClient: WechatPayClient
  ) {}

  async createOrder(userId: string, dto: CreatePaymentOrderDto, request?: HeaderRequestLike) {
    const userAgent = this.clientUserAgent(request);
    const clientIp = this.clientIp(request);
    const scene = dto.scene ?? detectPaymentScene(userAgent);
    const product = resolvePaymentProduct(dto.provider, scene);

    if (!product) {
      throw new AppException(40004, "当前环境不支持所选支付方式", HttpStatus.BAD_REQUEST);
    }

    const productAvailable = await this.paymentConfigService.isProductAvailable(product);

    if (!productAvailable && !this.isMockPaymentAllowed()) {
      throw new AppException(40004, "支付方式未启用或配置不完整", HttpStatus.BAD_REQUEST);
    }

    const selectedPackage = this.getPackage(dto.packageCode);
    const order = await this.prisma.paymentOrder.create({
      data: {
        userId,
        provider: dto.provider,
        scene,
        product,
        action: this.paymentAction(product),
        orderNo: this.createOrderNo(),
        amountCny: selectedPackage.amountCny,
        credits: selectedPackage.credits,
        clientIp,
        userAgent,
        status: "CREATED"
      }
    });
    const channelOrder = await this.createChannelOrder(product, userId, {
      orderNo: order.orderNo,
      amountCny: order.amountCny.toString(),
      credits: order.credits,
      clientIp
    });
    const updatedOrder = await this.prisma.paymentOrder.update({
      where: {
        id: order.id
      },
      data: {
        status: channelOrder.paymentMode === "REAL" ? "PAYING" : "CREATED",
        product: channelOrder.product,
        action: channelOrder.action,
        paymentUrl: channelOrder.paymentUrl,
        qrCodeUrl: channelOrder.qrCodeUrl,
        launchParams: channelOrder.launchParams ?? undefined,
        providerPayload: channelOrder.providerPayload ?? undefined
      }
    });

    return this.toPaymentOrder(updatedOrder);
  }

  async getOrder(userId: string, id: string) {
    const order = await this.prisma.paymentOrder.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!order) {
      throw new AppException(40401, "支付订单不存在", HttpStatus.NOT_FOUND);
    }

    return this.toPaymentOrder(order);
  }

  async listAdminOrders() {
    const orders = await this.prisma.paymentOrder.findMany({
      include: {
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
      take: 100
    });

    return orders.map((order) => this.toPaymentOrder(order));
  }

  async getAdminOrder(id: string) {
    const order = await this.prisma.paymentOrder.findUnique({
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
        }
      }
    });

    if (!order) {
      throw new AppException(40401, "支付订单不存在", HttpStatus.NOT_FOUND);
    }

    return this.toPaymentOrder(order);
  }

  async listNotifyLogs(orderNo?: string) {
    const logs = await this.prisma.paymentNotifyLog.findMany({
      where: orderNo
        ? {
            orderNo
          }
        : undefined,
      orderBy: {
        createdAt: "desc"
      },
      take: 100
    });

    return logs.map((log) => ({
      id: log.id,
      provider: log.provider,
      providerName: this.providerName(log.provider),
      orderNo: log.orderNo,
      headers: log.headers,
      body: log.body,
      verifyResult: log.verifyResult,
      processResult: log.processResult,
      errorMessage: log.errorMessage,
      createdAt: log.createdAt
    }));
  }

  async handleAlipayNotify(body: Record<string, unknown>, headers: Record<string, unknown> = {}) {
    let verified: VerifiedPaymentResult;

    try {
      verified = await this.alipayClient.verifyNotify(body);
    } catch (error) {
      await this.logFailedNotify("ALIPAY", body, headers, error);
      throw error;
    }

    return this.handleVerifiedNotify({
      provider: "ALIPAY",
      body,
      headers,
      verified
    });
  }

  async handleWechatNotify(
    body: Record<string, unknown>,
    request: {
      rawBody?: Buffer;
      headers: Record<string, string | string[] | undefined>;
    }
  ) {
    const headers = sanitizeHeaders(request.headers);
    let verified: VerifiedPaymentResult;

    try {
      verified = await this.wechatPayClient.verifyNotify(body, request);
    } catch (error) {
      await this.logFailedNotify("WECHAT_PAY", body, headers, error);
      throw error;
    }

    return this.handleVerifiedNotify({
      provider: "WECHAT_PAY",
      body,
      headers,
      verified
    });
  }

  async handleMockNotify(provider: PaymentProvider, body: Record<string, unknown>) {
    if (provider !== "ALIPAY" && provider !== "WECHAT_PAY") {
      throw new AppException(40001, "支付渠道不支持", HttpStatus.BAD_REQUEST);
    }

    if (process.env.ENABLE_MOCK_PAYMENT_NOTIFY !== "1" && process.env.NODE_ENV === "production") {
      throw new AppException(40301, "生产环境不允许模拟支付回调", HttpStatus.FORBIDDEN);
    }

    const orderNo = this.extractString(body.orderNo ?? body.out_trade_no);
    const providerTradeNo = this.extractString(
      body.providerTradeNo ?? body.trade_no ?? body.transaction_id
    );
    const amountCny = this.extractString(body.amountCny ?? body.total_amount);

    if (!orderNo) {
      throw new AppException(40001, "支付通知缺少订单号", HttpStatus.BAD_REQUEST);
    }

    const order = await this.prisma.paymentOrder.findUnique({
      where: {
        orderNo
      }
    });

    if (!order) {
      throw new AppException(40401, "支付订单不存在", HttpStatus.NOT_FOUND);
    }

    return this.handleVerifiedNotify({
      provider,
      body,
      headers: {},
      verified: {
        orderNo,
        providerTradeNo: providerTradeNo || `MOCK${Date.now()}`,
        paidAt: new Date(),
        amountCny: amountCny || order.amountCny.toString(),
        raw: toInputJson(body) as Prisma.InputJsonValue
      }
    });
  }

  async syncOrder(id: string) {
    const order = await this.prisma.paymentOrder.findUnique({
      where: {
        id
      }
    });

    if (!order) {
      throw new AppException(40401, "支付订单不存在", HttpStatus.NOT_FOUND);
    }

    const queryResult = await this.queryChannelOrder(order.provider, order.orderNo);
    this.assertOrderMatches(order, queryResult);

    if (queryResult.paid) {
      const settled = await this.settlePaidOrder(order.provider, {
        orderNo: order.orderNo,
        providerTradeNo: queryResult.providerTradeNo ?? "",
        amountCny: queryResult.amountCny ?? order.amountCny.toString(),
        paidAt: queryResult.paidAt ?? new Date(),
        raw: queryResult.raw
      });

      return {
        synced: true,
        credited: settled.credited,
        order: settled.order,
        wallet: settled.wallet,
        channelStatus: "PAID"
      };
    }

    if (queryResult.closed && order.status !== "PAID") {
      const updatedOrder = await this.prisma.paymentOrder.update({
        where: {
          id: order.id
        },
        data: {
          status: "CLOSED",
          providerPayload: queryResult.raw
        }
      });

      return {
        synced: true,
        credited: false,
        order: this.toPaymentOrder(updatedOrder),
        wallet: null,
        channelStatus: "CLOSED"
      };
    }

    const refreshedOrder = await this.prisma.paymentOrder.update({
      where: {
        id: order.id
      },
      data: {
        providerPayload: queryResult.raw
      }
    });

    return {
      synced: true,
      credited: false,
      order: this.toPaymentOrder(refreshedOrder),
      wallet: null,
      channelStatus: "UNPAID"
    };
  }

  async supplementOrder(id: string) {
    const result = await this.syncOrder(id);

    if (result.channelStatus !== "PAID") {
      throw new AppException(40004, "支付渠道未确认成功，不能手动补单", HttpStatus.BAD_REQUEST);
    }

    return result;
  }

  private async handleVerifiedNotify(input: NotifyInput) {
    const orderNo = input.verified.orderNo;
    const log = await this.prisma.paymentNotifyLog.create({
      data: {
        provider: input.provider,
        orderNo,
        headers: this.toJson(input.headers ?? {}),
        body: this.toJson(input.body),
        verifyResult: "SUCCESS",
        processResult: "PENDING"
      }
    });

    try {
      const result = await this.settlePaidOrder(input.provider, input.verified);

      await this.prisma.paymentNotifyLog.update({
        where: {
          id: log.id
        },
        data: {
          processResult: result.credited ? "CREDITED" : "DUPLICATE"
        }
      });

      return result;
    } catch (error) {
      await this.prisma.paymentNotifyLog.update({
        where: {
          id: log.id
        },
        data: {
          processResult: "FAILED",
          errorMessage: error instanceof Error ? error.message : "支付通知处理失败"
        }
      });

      throw error;
    }
  }

  private async logFailedNotify(
    provider: PaymentProvider,
    body: Record<string, unknown>,
    headers: Record<string, unknown>,
    error: unknown
  ) {
    const orderNo = this.extractString(body.orderNo ?? body.out_trade_no);

    await this.prisma.paymentNotifyLog.create({
      data: {
        provider,
        orderNo: orderNo || null,
        headers: this.toJson(headers),
        body: this.toJson(body),
        verifyResult: "FAILED",
        processResult: "FAILED",
        errorMessage: error instanceof Error ? error.message : "支付通知验签失败"
      }
    });
  }

  private async settlePaidOrder(expectedProvider: PaymentProvider, verified: VerifiedPaymentResult) {
    const result = await this.prisma.$transaction(async (transaction) => {
      const order = await transaction.paymentOrder.findUnique({
        where: {
          orderNo: verified.orderNo
        }
      });

      if (!order) {
        throw new AppException(40401, "支付订单不存在", HttpStatus.NOT_FOUND);
      }

      if (order.provider !== expectedProvider) {
        throw new AppException(40001, "支付渠道与订单不匹配", HttpStatus.BAD_REQUEST);
      }

      this.assertAmountMatches(order.amountCny.toString(), verified.amountCny);

      if (order.status === "PAID") {
        const updatedOrder = await transaction.paymentOrder.update({
          where: {
            id: order.id
          },
          data: {
            providerTradeNo: verified.providerTradeNo || order.providerTradeNo,
            notifyRaw: verified.raw
          }
        });
        const wallet = await this.ensureWallet(transaction, order.userId);

        return {
          credited: false,
          order: updatedOrder,
          wallet
        };
      }

      if (order.status === "CLOSED" || order.status === "FAILED") {
        throw new AppException(40004, "订单已关闭，不能入账", HttpStatus.BAD_REQUEST);
      }

      const statusChanged = await transaction.paymentOrder.updateMany({
        where: {
          id: order.id,
          status: {
            in: ["CREATED", "PAYING"]
          }
        },
        data: {
          status: "PAID",
          providerTradeNo: verified.providerTradeNo || undefined,
          notifyRaw: verified.raw,
          paidAt: verified.paidAt
        }
      });

      if (statusChanged.count === 0) {
        const currentOrder = await transaction.paymentOrder.findUniqueOrThrow({
          where: {
            id: order.id
          }
        });
        const wallet = await this.ensureWallet(transaction, order.userId);

        return {
          credited: false,
          order: currentOrder,
          wallet
        };
      }

      await this.ensureWallet(transaction, order.userId);
      const wallet = await transaction.wallet.update({
        where: {
          userId: order.userId
        },
        data: {
          availableCredits: {
            increment: order.credits
          },
          totalTopUpCredits: {
            increment: order.credits
          }
        }
      });

      await transaction.ledgerEntry.create({
        data: {
          userId: order.userId,
          type: "TOP_UP",
          amount: order.credits,
          balanceAfter: wallet.availableCredits,
          relatedOrderId: order.id,
          idempotencyKey: `payment:${order.id}:top-up`,
          note: `${this.providerName(order.provider)}充值 ${order.credits} 点`
        }
      });

      const updatedOrder = await transaction.paymentOrder.findUniqueOrThrow({
        where: {
          id: order.id
        }
      });

      return {
        credited: true,
        order: updatedOrder,
        wallet
      };
    });

    return {
      credited: result.credited,
      order: this.toPaymentOrder(result.order),
      wallet: result.wallet
    };
  }

  private async createChannelOrder(
    product: PaymentProduct,
    userId: string,
    order: {
      orderNo: string;
      amountCny: string;
      credits: number;
      clientIp: string | null;
    }
  ) {
    if (product === "ALIPAY_PAGE") {
      return this.alipayClient.createPagePayOrder(order);
    }

    if (product === "ALIPAY_WAP") {
      return this.alipayClient.createWapPayOrder(order);
    }

    if (product === "WECHAT_NATIVE") {
      return this.wechatPayClient.createNativeOrder(order);
    }

    if (product === "WECHAT_H5") {
      if (!order.clientIp) {
        throw new AppException(40001, "微信 H5 支付缺少客户端 IP", HttpStatus.BAD_REQUEST);
      }

      return this.wechatPayClient.createH5Order({
        ...order,
        clientIp: order.clientIp
      });
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: userId
      },
      select: {
        wechatOpenId: true
      }
    });

    if (!user?.wechatOpenId) {
      throw new AppException(40004, "请先完成微信授权后再发起支付", HttpStatus.BAD_REQUEST);
    }

    return this.wechatPayClient.createJsapiOrder({
      ...order,
      openId: user.wechatOpenId
    });
  }

  private async queryChannelOrder(provider: PaymentProvider, orderNo: string) {
    if (provider === "ALIPAY") {
      return this.alipayClient.queryOrder(orderNo);
    }

    return this.wechatPayClient.queryOrder(orderNo);
  }

  private assertOrderMatches(
    order: {
      orderNo: string;
      amountCny: { toString(): string };
    },
    queryResult: ChannelQueryResult
  ) {
    if (queryResult.orderNo !== order.orderNo) {
      throw new AppException(40001, "支付渠道订单号不匹配", HttpStatus.BAD_REQUEST);
    }

    if (queryResult.amountCny) {
      this.assertAmountMatches(order.amountCny.toString(), queryResult.amountCny);
    }
  }

  private assertAmountMatches(expected: string, actual: string) {
    if (amountToCents(expected) !== amountToCents(actual)) {
      throw new AppException(40001, "支付金额与本地订单不匹配", HttpStatus.BAD_REQUEST);
    }
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

  private getPackage(packageCode: string): CreditPackage {
    const selectedPackage = creditPackages.find((item) => item.code === packageCode);

    if (!selectedPackage) {
      throw new AppException(40001, "充值套餐不存在", HttpStatus.BAD_REQUEST);
    }

    return selectedPackage;
  }

  private createOrderNo() {
    const timestamp = new Date()
      .toISOString()
      .replace(/\D/g, "")
      .slice(0, 14);
    const suffix = randomBytes(4).toString("hex").toUpperCase();

    return `PAY${timestamp}${suffix}`;
  }

  private toPaymentOrder(order: {
    id: string;
    userId: string;
    provider: PaymentProvider;
    scene: PaymentScene;
    product: PaymentProduct;
    action: "REDIRECT" | "QR_CODE" | "WECHAT_JSAPI";
    orderNo: string;
    amountCny: { toString(): string };
    credits: number;
    status: string;
    providerTradeNo: string | null;
    paymentUrl?: string | null;
    qrCodeUrl?: string | null;
    launchParams?: Prisma.JsonValue | null;
    providerPayload?: Prisma.JsonValue | null;
    notifyRaw?: Prisma.JsonValue | null;
    paidAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    user?: {
      id: string;
      email: string;
      nickname: string;
    };
  }) {
    const realPayment = Boolean(order.paymentUrl || order.qrCodeUrl);

    return {
      id: order.id,
      userId: order.userId,
      user: order.user ?? null,
      provider: order.provider,
      providerName: this.providerName(order.provider),
      scene: order.scene,
      product: order.product,
      action: order.action,
      orderNo: order.orderNo,
      amountCny: order.amountCny.toString(),
      credits: order.credits,
      status: order.status,
      statusName: this.statusName(order.status),
      providerTradeNo: order.providerTradeNo,
      paymentUrl: order.paymentUrl ?? null,
      qrCodeUrl: order.qrCodeUrl ?? null,
      launchParams: order.launchParams ?? null,
      providerPayload: order.providerPayload ?? null,
      notifyRaw: order.notifyRaw ?? null,
      paidAt: order.paidAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      paymentMode: realPayment ? "REAL" : "UNCONFIGURED",
      mockPaymentUrl: `https://mock-pay.local/${order.provider.toLowerCase()}/${order.orderNo}`,
      mockQrCodeUrl: `mock://payment/${order.provider.toLowerCase()}/${order.orderNo}`
    };
  }

  private providerName(provider: PaymentProvider) {
    return provider === "ALIPAY" ? "支付宝" : "微信支付";
  }

  private statusName(status: string) {
    const names: Record<string, string> = {
      CREATED: "已创建",
      PAYING: "支付中",
      PAID: "已支付",
      CLOSED: "已关闭",
      FAILED: "支付失败"
    };

    return names[status] ?? status;
  }

  async listAvailableProducts(userId: string) {
    const [configuredProducts, user] = await Promise.all([
      this.paymentConfigService.listAvailableProducts(),
      this.prisma.user.findUnique({
        where: {
          id: userId
        },
        select: {
          wechatOpenId: true
        }
      })
    ]);
    const products = this.isMockPaymentAllowed()
      ? this.withMockPaymentProducts(configuredProducts)
      : configuredProducts;
    const configuredProductNames = new Set(configuredProducts.map((product) => product.product));

    return products.map((product) => ({
      ...product,
      requiresAuthorization: configuredProductNames.has(product.product) && product.product === "WECHAT_JSAPI" && !user?.wechatOpenId
    }));
  }

  private withMockPaymentProducts(products: AvailablePaymentProduct[]) {
    const existingProducts = new Set(products.map((product) => product.product));
    const mockProducts: AvailablePaymentProduct[] = [
      {
        provider: "ALIPAY",
        providerName: "支付宝",
        scene: "DESKTOP_WEB",
        sceneName: paymentSceneName("DESKTOP_WEB"),
        product: "ALIPAY_PAGE",
        productName: paymentProductName("ALIPAY_PAGE"),
        description: "本地模拟支付宝电脑网站支付"
      },
      {
        provider: "ALIPAY",
        providerName: "支付宝",
        scene: "MOBILE_WEB",
        sceneName: paymentSceneName("MOBILE_WEB"),
        product: "ALIPAY_WAP",
        productName: paymentProductName("ALIPAY_WAP"),
        description: "本地模拟支付宝手机网站支付"
      },
      {
        provider: "WECHAT_PAY",
        providerName: "微信支付",
        scene: "DESKTOP_WEB",
        sceneName: paymentSceneName("DESKTOP_WEB"),
        product: "WECHAT_NATIVE",
        productName: paymentProductName("WECHAT_NATIVE"),
        description: "本地模拟微信 Native 扫码支付"
      },
      {
        provider: "WECHAT_PAY",
        providerName: "微信支付",
        scene: "MOBILE_WEB",
        sceneName: paymentSceneName("MOBILE_WEB"),
        product: "WECHAT_H5",
        productName: paymentProductName("WECHAT_H5"),
        description: "本地模拟微信 H5 支付"
      },
      {
        provider: "WECHAT_PAY",
        providerName: "微信支付",
        scene: "WECHAT_BROWSER",
        sceneName: paymentSceneName("WECHAT_BROWSER"),
        product: "WECHAT_JSAPI",
        productName: paymentProductName("WECHAT_JSAPI"),
        description: "本地模拟微信 JSAPI 支付"
      }
    ];

    return [
      ...products,
      ...mockProducts.filter((product) => !existingProducts.has(product.product))
    ];
  }

  private isMockPaymentAllowed() {
    return process.env.ENABLE_MOCK_PAYMENT_NOTIFY === "1" && process.env.NODE_ENV !== "production";
  }

  private paymentAction(product: PaymentProduct) {
    if (product === "WECHAT_NATIVE") {
      return "QR_CODE" as const;
    }

    if (product === "WECHAT_JSAPI") {
      return "WECHAT_JSAPI" as const;
    }

    return "REDIRECT" as const;
  }

  private clientIp(request?: HeaderRequestLike) {
    if (!request) {
      return null;
    }

    const forwarded = getHeaderValue(request.headers["x-client-ip"])?.trim();

    return forwarded || getClientIp(request);
  }

  private clientUserAgent(request?: HeaderRequestLike) {
    if (!request) {
      return null;
    }

    const forwarded = getHeaderValue(request.headers["x-client-user-agent"])?.trim();

    return forwarded || getUserAgent(request);
  }

  private extractString(value: unknown) {
    return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
  }

  private toJson(value: Record<string, unknown>): Prisma.InputJsonValue {
    return toInputJson(value) as Prisma.InputJsonValue;
  }
}

function sanitizeHeaders(headers: Record<string, unknown>) {
  const allowed = [
    "wechatpay-signature",
    "wechatpay-timestamp",
    "wechatpay-nonce",
    "wechatpay-serial",
    "content-type",
    "user-agent"
  ];
  const result: Record<string, unknown> = {};

  for (const key of allowed) {
    const value = headers[key];

    if (value) {
      result[key] = value;
    }
  }

  return result;
}
