import type { Prisma } from "@aisaas/database";

export type PaymentProvider = "ALIPAY" | "WECHAT_PAY";

export interface PaymentChannelOrder {
  paymentUrl: string | null;
  qrCodeUrl: string | null;
  providerPayload: Prisma.InputJsonValue | null;
  paymentMode: "REAL" | "UNCONFIGURED";
}

export interface VerifiedPaymentResult {
  orderNo: string;
  providerTradeNo: string;
  paidAt: Date;
  amountCny: string;
  raw: Prisma.InputJsonValue;
}

export interface ChannelQueryResult {
  orderNo: string;
  providerTradeNo: string | null;
  paidAt: Date | null;
  paid: boolean;
  closed: boolean;
  amountCny: string | null;
  raw: Prisma.InputJsonValue;
}
