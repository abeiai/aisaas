import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

interface ApiResponse<TData> {
  code: number;
  message: string;
  data: TData;
}

export type PaymentProvider = "ALIPAY" | "WECHAT_PAY";
export type PaymentOrderStatus = "CREATED" | "PAYING" | "PAID" | "CLOSED" | "FAILED";

export interface Wallet {
  id: string;
  userId: string;
  availableCredits: number;
  frozenCredits: number;
  totalTopUpCredits: number;
  totalConsumedCredits: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentOrder {
  id: string;
  userId: string;
  user: {
    id: string;
    email: string;
    nickname: string;
  } | null;
  provider: PaymentProvider;
  providerName: string;
  orderNo: string;
  amountCny: string;
  credits: number;
  status: PaymentOrderStatus;
  statusName: string;
  providerTradeNo: string | null;
  paymentUrl: string | null;
  qrCodeUrl: string | null;
  providerPayload: unknown;
  notifyRaw: unknown;
  paymentMode: "REAL" | "UNCONFIGURED";
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  mockPaymentUrl: string;
  mockQrCodeUrl: string;
}

export interface LedgerEntry {
  id: string;
  userId: string;
  type: "TOP_UP" | "RESERVE" | "CONSUME" | "RELEASE" | "REFUND" | "ADMIN_ADJUST";
  typeName: string;
  amount: number;
  balanceAfter: number;
  relatedOrderId: string | null;
  relatedTaskId: string | null;
  idempotencyKey: string;
  note: string | null;
  createdAt: string;
  relatedOrder: {
    id: string;
    orderNo: string;
    provider: PaymentProvider;
    amountCny: string;
    credits: number;
    status: PaymentOrderStatus;
  } | null;
}

export const rechargePackages = [
  {
    code: "starter",
    name: "入门充值包",
    amountCny: "19.90",
    credits: 1990,
    description: "适合体验基础内容生成流程。"
  },
  {
    code: "growth",
    name: "增长充值包",
    amountCny: "49.90",
    credits: 5990,
    description: "适合连续使用和小规模内容运营。"
  },
  {
    code: "pro",
    name: "专业充值包",
    amountCny: "99.00",
    credits: 12900,
    description: "适合高频任务和团队试运行。"
  }
] as const;

function getApiBaseUrl() {
  return process.env.API_BASE_URL ?? "http://localhost:7342/api";
}

async function getCookieHeader() {
  const cookieStore = await cookies();

  return cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${encodeURIComponent(cookie.value)}`)
    .join("; ");
}

async function apiFetch<TData>(path: string, init: RequestInit = {}, options = { user: true }) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  if (options.user) {
    headers.set("Cookie", await getCookieHeader());
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store"
  });
  const payload = (await response.json()) as ApiResponse<TData | null>;

  if (!response.ok || payload.code !== 0 || payload.data === null) {
    throw new Error(payload.message || "请求失败");
  }

  return payload.data;
}

export async function getWallet() {
  return apiFetch<Wallet>("/wallet/me");
}

export async function getLedger() {
  return apiFetch<LedgerEntry[]>("/wallet/ledger");
}

export async function getPaymentOrder(id: string) {
  return apiFetch<PaymentOrder>(`/payment/orders/${id}`);
}

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "请求失败";
}

export async function createPaymentOrderAction(formData: FormData) {
  "use server";

  let target: string;

  try {
    const order = await apiFetch<PaymentOrder>("/payment/orders", {
      method: "POST",
      body: JSON.stringify({
        provider: text(formData, "provider"),
        packageCode: text(formData, "packageCode")
      })
    });
    target = `/dashboard/billing?order=${order.id}`;
  } catch (error) {
    target = `/dashboard/billing?error=${encodeURIComponent(errorMessage(error))}`;
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/billing");
  redirect(target);
}

export async function mockPayOrderAction(formData: FormData) {
  "use server";

  const orderId = text(formData, "orderId");
  const orderNo = text(formData, "orderNo");
  const provider = text(formData, "provider") as PaymentProvider;
  const notifyPath = `/payment/mock/${provider}/notify`;
  let target: string;

  try {
    await apiFetch(
      notifyPath,
      {
        method: "POST",
        body: JSON.stringify({
          orderNo,
          providerTradeNo: `MOCK${Date.now()}`,
          tradeStatus: "SUCCESS"
        })
      },
      { user: false }
    );
    target = `/dashboard/billing?order=${orderId}&paid=1`;
  } catch (error) {
    target = `/dashboard/billing?order=${orderId}&error=${encodeURIComponent(errorMessage(error))}`;
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/billing");
  redirect(target);
}
