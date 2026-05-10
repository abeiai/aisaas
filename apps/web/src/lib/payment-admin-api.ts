"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import type { PaymentOrder, PaymentProvider } from "@/lib/billing-api";

interface ApiResponse<TData> {
  code: number;
  message: string;
  data: TData;
}

export interface PaymentNotifyLog {
  id: string;
  provider: PaymentProvider;
  providerName: string;
  orderNo: string | null;
  headers: unknown;
  body: unknown;
  verifyResult: string;
  processResult: string;
  errorMessage: string | null;
  createdAt: string;
}

export interface PaymentSyncResult {
  synced: boolean;
  credited: boolean;
  order: PaymentOrder;
  channelStatus: "PAID" | "CLOSED" | "UNPAID";
}

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

async function apiFetch<TData>(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Cookie", await getCookieHeader());

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

export async function getAdminPaymentOrders() {
  return apiFetch<PaymentOrder[]>("/admin/payments");
}

export async function getAdminPaymentOrder(id: string) {
  return apiFetch<PaymentOrder>(`/admin/payments/${id}`);
}

export async function getPaymentNotifyLogs(orderNo?: string) {
  const query = orderNo ? `?orderNo=${encodeURIComponent(orderNo)}` : "";

  return apiFetch<PaymentNotifyLog[]>(`/admin/payments/notify-logs${query}`);
}

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

async function paymentMutation(path: string) {
  await apiFetch<PaymentSyncResult>(path, {
    method: "POST"
  });
  revalidatePath("/admin");
  revalidatePath("/admin/payments");
}

export async function syncPaymentOrderAction(formData: FormData) {
  await paymentMutation(`/admin/payments/${text(formData, "id")}/sync`);
}

export async function supplementPaymentOrderAction(formData: FormData) {
  await paymentMutation(`/admin/payments/${text(formData, "id")}/supplement`);
}
