"use server";

import { revalidatePath } from "next/cache";

import { adminApiFetch } from "@/lib/admin-api-fetch";

export interface AdminUserListItem {
  id: string;
  email: string;
  nickname: string;
  status: "ACTIVE" | "DISABLED";
  statusName: string;
  availableCredits: number;
  frozenCredits: number;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminWallet {
  id: string;
  userId: string;
  availableCredits: number;
  frozenCredits: number;
  totalTopUpCredits: number;
  totalConsumedCredits: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminLedgerEntry {
  id: string;
  userId: string;
  type: string;
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
    provider: string;
    amountCny: string;
    credits: number;
    status: string;
  } | null;
  relatedTask: {
    id: string;
    status: string;
    scenarioName: string | null;
  } | null;
}

export interface AdminUserPaymentOrder {
  id: string;
  orderNo: string;
  provider: string;
  providerName: string;
  amountCny: string;
  credits: number;
  status: string;
  statusName: string;
  providerTradeNo: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserAiTask {
  id: string;
  scenarioId: string;
  scenarioName: string;
  status: string;
  statusName: string;
  estimatedCredits: number;
  actualCredits: number | null;
  providerName: string | null;
  modelName: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  errorMessage: string | null;
  createdAt: string;
  finishedAt: string | null;
  reservation: {
    id: string;
    amount: number;
    status: string;
  } | null;
}

export interface AdminUserDetail {
  user: {
    id: string;
    email: string;
    nickname: string;
    status: "ACTIVE" | "DISABLED";
    statusName: string;
    createdAt: string;
    lastLoginAt: string | null;
    updatedAt: string;
  };
  wallet: AdminWallet;
  paymentOrders: AdminUserPaymentOrder[];
  rechargeRecords: AdminLedgerEntry[];
  consumeRecords: AdminLedgerEntry[];
  ledgerEntries: AdminLedgerEntry[];
  aiTasks: AdminUserAiTask[];
}

async function apiFetch<TData>(path: string, init: RequestInit = {}) {
  return adminApiFetch<TData>(path, init);
}

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function numberValue(formData: FormData, name: string) {
  const value = Number(formData.get(name) ?? 0);

  return Number.isFinite(value) ? Math.trunc(value) : 0;
}

function revalidateUserPaths(id: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${id}`);
  revalidatePath("/admin/operation-logs");
}

export async function getAdminUsers() {
  return apiFetch<AdminUserListItem[]>("/admin/users");
}

export async function getAdminUser(id: string) {
  return apiFetch<AdminUserDetail>(`/admin/users/${id}`);
}

export async function updateUserStatusAction(formData: FormData) {
  const id = text(formData, "id");
  await apiFetch<AdminUserListItem>(`/admin/users/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({
      status: text(formData, "status")
    })
  });

  revalidateUserPaths(id);
}

export async function adjustUserCreditsAction(formData: FormData) {
  const id = text(formData, "id");
  await apiFetch(`/admin/users/${id}/credits/adjust`, {
    method: "POST",
    body: JSON.stringify({
      amount: numberValue(formData, "amount"),
      reason: text(formData, "reason")
    })
  });

  revalidateUserPaths(id);
}

export async function rechargeUserCreditsAction(formData: FormData) {
  const id = text(formData, "id");
  await apiFetch(`/admin/users/${id}/credits/recharge`, {
    method: "POST",
    body: JSON.stringify({
      amount: numberValue(formData, "amount"),
      reasonType: text(formData, "reasonType"),
      reason: text(formData, "reason") || undefined
    })
  });

  revalidateUserPaths(id);
}
