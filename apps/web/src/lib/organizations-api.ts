"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

interface ApiResponse<TData> {
  code: number;
  message: string;
  data: TData;
}

export interface ActionResult {
  ok: boolean;
  message?: string;
}

export interface OrganizationWallet {
  id: string;
  orgId: string;
  status: string;
  balanceTotal: number;
  balanceAvailable: number;
  balanceReserved: number;
  totalPurchased: number;
  totalGranted: number;
  totalConsumed: number;
  totalExpired: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationQuota {
  id: string;
  orgId: string;
  memberId: string;
  quotaType: string;
  totalQuota: number;
  usedQuota: number;
  reservedQuota: number;
  remainingQuota: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  id: string;
  orgId: string;
  userId: string;
  email: string;
  nickname: string;
  role: string;
  roleName: string;
  status: string;
  statusName: string;
  title: string | null;
  joinedAt: string;
  quotas: OrganizationQuota[];
}

export interface UserOrganization {
  id: string;
  name: string;
  status: string;
  role: string;
  memberId: string;
  memberStatus: string;
  wallet: OrganizationWallet | null;
  quota: {
    totalQuota: number;
    usedQuota: number;
    reservedQuota: number;
    remainingQuota: number;
  };
}

export interface OrganizationDetail {
  id: string;
  name: string;
  legalName: string | null;
  type: string;
  status: string;
  billingMode: string;
  ownerUserId: string;
  owner: {
    id: string;
    email: string;
    nickname: string;
  };
  wallet: OrganizationWallet | null;
  members: OrganizationMember[];
  quotas: OrganizationQuota[];
  ledgers: Array<{
    id: string;
    direction: string;
    transactionType: string;
    pointsDelta: number;
    balanceAfter: number;
    remark: string | null;
    createdAt: string;
  }>;
  usageEvents: Array<{
    id: string;
    featureCode: string;
    pointsCharged: number;
    status: string;
    occurredAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface UserOrganizationsResult {
  enabled: boolean;
  organizations: UserOrganization[];
}

export interface AdminOrganizationsResult {
  enabled: boolean;
  organizations: Array<{
    id: string;
    name: string;
    legalName: string | null;
    type: string;
    industry: string | null;
    employeeSize: string | null;
    status: string;
    ownerUserId: string;
    owner: {
      id: string;
      email: string;
      nickname: string;
    };
    wallet: OrganizationWallet | null;
    memberCount: number;
    createdAt: string;
    updatedAt: string;
  }>;
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

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function numberValue(formData: FormData, name: string) {
  const value = Number(formData.get(name) ?? 0);

  return Number.isFinite(value) ? Math.trunc(value) : 0;
}

export async function getUserOrganizations() {
  return apiFetch<UserOrganizationsResult>("/organizations");
}

export async function getOrganization(id: string) {
  return apiFetch<OrganizationDetail>(`/organizations/${id}`);
}

export async function createOrganizationAction(formData: FormData) {
  await apiFetch<OrganizationDetail>("/organizations", {
    method: "POST",
    body: JSON.stringify({
      name: text(formData, "name"),
      legalName: text(formData, "legalName") || undefined,
      type: text(formData, "type") || undefined,
      industry: text(formData, "industry") || undefined,
      employeeSize: text(formData, "employeeSize") || undefined
    })
  });

  revalidatePath("/dashboard/organizations");
}

export async function addOrganizationMemberAction(formData: FormData) {
  const orgId = text(formData, "orgId");
  await apiFetch<OrganizationMember>(`/organizations/${orgId}/members`, {
    method: "POST",
    body: JSON.stringify({
      email: text(formData, "email"),
      role: text(formData, "role"),
      title: text(formData, "title") || undefined
    })
  });

  revalidatePath("/dashboard/organizations");
  revalidatePath(`/dashboard/organizations?org=${orgId}`);
}

export async function allocateOrganizationQuotaAction(formData: FormData) {
  const orgId = text(formData, "orgId");
  const memberId = text(formData, "memberId");
  await apiFetch<OrganizationQuota>(`/organizations/${orgId}/members/${memberId}/quotas`, {
    method: "POST",
    body: JSON.stringify({
      totalQuota: numberValue(formData, "totalQuota"),
      quotaType: text(formData, "quotaType") || "ONE_TIME",
      remark: text(formData, "remark") || undefined
    })
  });

  revalidatePath("/dashboard/organizations");
  revalidatePath(`/dashboard/organizations?org=${orgId}`);
}

export async function getAdminOrganizations() {
  return apiFetch<AdminOrganizationsResult>("/admin/organizations");
}

export async function getAdminOrganization(id: string) {
  return apiFetch<OrganizationDetail>(`/admin/organizations/${id}`);
}

export async function createAdminOrganizationAction(formData: FormData) {
  try {
    await apiFetch<OrganizationDetail>("/admin/organizations", {
      method: "POST",
      body: JSON.stringify({
        name: text(formData, "name"),
        legalName: text(formData, "legalName") || undefined,
        type: text(formData, "type") || undefined,
        industry: text(formData, "industry") || undefined,
        employeeSize: text(formData, "employeeSize") || undefined,
        ownerEmail: text(formData, "ownerEmail"),
        status: text(formData, "status") || "ACTIVE"
      })
    });

    revalidatePath("/admin/organizations");

    return { ok: true } satisfies ActionResult;
  } catch (error) {
    return actionError(error, "企业账号创建失败，请稍后重试。");
  }
}

export async function updateAdminOrganizationAction(formData: FormData) {
  const orgId = text(formData, "orgId");
  try {
    await apiFetch<OrganizationDetail>(`/admin/organizations/${orgId}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: text(formData, "name") || undefined,
        legalName: text(formData, "legalName") || undefined,
        type: text(formData, "type") || undefined,
        industry: text(formData, "industry") || undefined,
        employeeSize: text(formData, "employeeSize") || undefined,
        status: text(formData, "status") || undefined
      })
    });

    revalidatePath("/admin/organizations");
    revalidatePath(`/admin/organizations/${orgId}`);

    return { ok: true } satisfies ActionResult;
  } catch (error) {
    return actionError(error, "企业账号保存失败，请稍后重试。");
  }
}

export async function toggleAdminOrganizationStatusAction(formData: FormData) {
  const orgId = text(formData, "orgId");
  const status = text(formData, "status");
  try {
    await apiFetch<OrganizationDetail>(`/admin/organizations/${orgId}`, {
      method: "PATCH",
      body: JSON.stringify({
        status
      })
    });

    revalidatePath("/admin/organizations");
    revalidatePath(`/admin/organizations/${orgId}`);

    return { ok: true } satisfies ActionResult;
  } catch (error) {
    return actionError(error, "企业账号状态更新失败，请稍后重试。");
  }
}

export async function adjustOrganizationCreditsAction(formData: FormData) {
  const orgId = text(formData, "orgId");
  await apiFetch(`/admin/organizations/${orgId}/credits/adjust`, {
    method: "POST",
    body: JSON.stringify({
      amount: numberValue(formData, "amount"),
      transactionType: text(formData, "transactionType") || "GIFT",
      reason: text(formData, "reason")
    })
  });

  revalidatePath("/admin/organizations");
  revalidatePath(`/admin/organizations/${orgId}`);
}

function actionError(error: unknown, fallback: string): ActionResult {
  return {
    ok: false,
    message: error instanceof Error ? error.message : fallback
  };
}
