import { HttpStatus, Injectable } from "@nestjs/common";
import { AppException } from "../common/app-exception.js";
import { signRsaSha256, toInputJson, verifyRsaSha256 } from "./payment-crypto.js";
import type {
  ChannelQueryResult,
  PaymentChannelOrder,
  VerifiedPaymentResult
} from "./payment-channel.types.js";

interface AlipayOrderInput {
  orderNo: string;
  amountCny: string;
  credits: number;
}

@Injectable()
export class AlipayClient {
  createPagePayOrder(order: AlipayOrderInput): PaymentChannelOrder {
    if (!this.isConfigured()) {
      return {
        paymentUrl: null,
        qrCodeUrl: null,
        providerPayload: null,
        paymentMode: "UNCONFIGURED"
      };
    }

    const bizContent = {
      out_trade_no: order.orderNo,
      total_amount: order.amountCny,
      subject: `AI SaaS 点数充值 ${order.credits} 点`,
      product_code: "FAST_INSTANT_TRADE_PAY"
    };
    const params = this.buildSignedParams("alipay.trade.page.pay", bizContent, {
      notify_url: this.requiredEnv("ALIPAY_NOTIFY_URL")
    });

    return {
      paymentUrl: `${this.gatewayUrl()}?${new URLSearchParams(params).toString()}`,
      qrCodeUrl: null,
      providerPayload: toInputJson({
        method: "alipay.trade.page.pay",
        bizContent
      }),
      paymentMode: "REAL"
    };
  }

  verifyNotify(body: Record<string, unknown>): VerifiedPaymentResult {
    if (!this.isConfigured()) {
      throw new AppException(50002, "支付宝支付配置缺失", HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const sign = stringValue(body.sign);

    if (!sign) {
      throw new AppException(40001, "支付宝回调缺少签名", HttpStatus.BAD_REQUEST);
    }

    const content = this.alipaySignContent(body);

    if (!verifyRsaSha256(content, sign, this.requiredEnv("ALIPAY_PUBLIC_KEY"))) {
      throw new AppException(40001, "支付宝回调验签失败", HttpStatus.BAD_REQUEST);
    }

    const appId = stringValue(body.app_id);
    const configuredAppId = this.requiredEnv("ALIPAY_APP_ID");

    if (appId && appId !== configuredAppId) {
      throw new AppException(40001, "支付宝应用编号不匹配", HttpStatus.BAD_REQUEST);
    }

    const tradeStatus = stringValue(body.trade_status);

    if (tradeStatus !== "TRADE_SUCCESS" && tradeStatus !== "TRADE_FINISHED") {
      throw new AppException(40004, "支付宝订单尚未支付成功", HttpStatus.BAD_REQUEST);
    }

    const orderNo = stringValue(body.out_trade_no);
    const providerTradeNo = stringValue(body.trade_no);
    const amountCny = stringValue(body.total_amount);

    if (!orderNo || !providerTradeNo || !amountCny) {
      throw new AppException(40001, "支付宝回调参数不完整", HttpStatus.BAD_REQUEST);
    }

    return {
      orderNo,
      providerTradeNo,
      amountCny,
      paidAt: new Date(),
      raw: toInputJson(body)
    };
  }

  async queryOrder(orderNo: string): Promise<ChannelQueryResult> {
    if (!this.isConfigured()) {
      throw new AppException(50002, "支付宝支付配置缺失", HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const params = this.buildSignedParams("alipay.trade.query", {
      out_trade_no: orderNo
    });
    const response = await fetch(`${this.gatewayUrl()}?${new URLSearchParams(params).toString()}`);
    const payload = await response.json() as {
      alipay_trade_query_response?: {
        code?: string;
        msg?: string;
        out_trade_no?: string;
        trade_no?: string;
        trade_status?: string;
        total_amount?: string;
      };
    };
    const result = payload.alipay_trade_query_response;

    if (!response.ok || !result || result.code !== "10000") {
      throw new AppException(40004, "支付宝订单查询失败", HttpStatus.BAD_REQUEST);
    }

    const paid = result.trade_status === "TRADE_SUCCESS" || result.trade_status === "TRADE_FINISHED";
    const closed = result.trade_status === "TRADE_CLOSED";

    return {
      orderNo: result.out_trade_no ?? orderNo,
      providerTradeNo: result.trade_no ?? null,
      paid,
      closed,
      amountCny: result.total_amount ?? null,
      paidAt: paid ? new Date() : null,
      raw: toInputJson(payload)
    };
  }

  isConfigured() {
    return Boolean(
      process.env.ALIPAY_APP_ID &&
      process.env.ALIPAY_PRIVATE_KEY &&
      process.env.ALIPAY_PUBLIC_KEY &&
      process.env.ALIPAY_NOTIFY_URL
    );
  }

  private buildSignedParams(
    method: string,
    bizContent: Record<string, unknown>,
    extra: Record<string, string> = {}
  ) {
    const params: Record<string, string> = {
      app_id: this.requiredEnv("ALIPAY_APP_ID"),
      method,
      format: "JSON",
      charset: "utf-8",
      sign_type: "RSA2",
      timestamp: formatAlipayTimestamp(new Date()),
      version: "1.0",
      biz_content: JSON.stringify(bizContent),
      ...extra
    };
    const signContent = this.alipaySignContent(params);

    params.sign = signRsaSha256(signContent, this.requiredEnv("ALIPAY_PRIVATE_KEY"));

    return params;
  }

  private alipaySignContent(params: Record<string, unknown>) {
    return Object.entries(params)
      .filter(([key, value]) => key !== "sign" && key !== "sign_type" && value !== undefined && value !== null)
      .map(([key, value]) => [key, stringValue(value)] as const)
      .filter(([, value]) => value !== "")
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}=${value}`)
      .join("&");
  }

  private gatewayUrl() {
    if (process.env.ALIPAY_GATEWAY_URL) {
      return process.env.ALIPAY_GATEWAY_URL;
    }

    return process.env.ALIPAY_ENV === "production"
      ? "https://openapi.alipay.com/gateway.do"
      : "https://openapi-sandbox.dl.alipaydev.com/gateway.do";
  }

  private requiredEnv(name: string) {
    const value = process.env[name];

    if (!value) {
      throw new AppException(50002, "支付宝支付配置缺失", HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return value;
  }
}

function formatAlipayTimestamp(value: Date) {
  const pad = (input: number) => String(input).padStart(2, "0");

  return [
    value.getFullYear(),
    "-",
    pad(value.getMonth() + 1),
    "-",
    pad(value.getDate()),
    " ",
    pad(value.getHours()),
    ":",
    pad(value.getMinutes()),
    ":",
    pad(value.getSeconds())
  ].join("");
}

function stringValue(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}
