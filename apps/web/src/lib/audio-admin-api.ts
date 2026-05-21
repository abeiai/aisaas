"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

interface ApiResponse<TData> {
  code: number;
  message: string;
  data: TData;
}

export type AudioOperationType = "TTS" | "VOICE_CLONE" | "VOICE_DESIGN";
export type AudioBillingMode = "PER_CHARACTER" | "PER_TASK" | "PER_SECOND";

export interface AudioPricingRule {
  id: string;
  operationType: AudioOperationType;
  operationTypeName: string;
  model: string;
  billingMode: AudioBillingMode;
  billingModeName: string;
  creditsPerUnit: number;
  minimumCredits: number;
  modelMultiplier: number;
  isEnabled: boolean;
  statusName: string;
  createdAt: string;
  updatedAt: string;
}

export interface AudioUsageSummary {
  requestCount: number;
  successCount: number;
  failureCount: number;
  failureRate: number;
  ttsCount: number;
  voiceCloneCount: number;
  voiceDesignCount: number;
  characterCount: number;
  audioDurationMs: number;
  consumedCredits: number;
  estimatedCost: number;
  avgLatencyMs: number;
}

export interface AudioUsageGroup extends AudioUsageSummary {
  id: string;
  name: string;
}

export interface AudioUsageLog {
  id: string;
  taskId: string;
  userId: string;
  user: {
    id: string;
    email: string;
    nickname: string;
  } | null;
  provider: string;
  model: string;
  operationType: AudioOperationType;
  operationTypeName: string;
  voiceAssetId: string | null;
  voiceName: string;
  taskStatus: string;
  taskStatusName: string;
  characterCount: number;
  audioDurationMs: number | null;
  usageCount: number;
  latencyMs: number | null;
  success: boolean;
  estimatedCost: number;
  consumedCredits: number;
  providerRequestId: string | null;
  createdAt: string;
}

export interface AudioUsageDashboard {
  filters: {
    from: string;
    to: string;
    operationType: string;
    model: string;
  };
  total: AudioUsageSummary;
  today: AudioUsageSummary;
  trend: Array<{ date: string } & AudioUsageSummary>;
  byOperation: AudioUsageGroup[];
  byModel: AudioUsageGroup[];
  byUser: AudioUsageGroup[];
  byVoice: AudioUsageGroup[];
  byStatus: AudioUsageGroup[];
  recentLogs: AudioUsageLog[];
  operationTypes: Array<{
    id: AudioOperationType;
    name: string;
  }>;
  models: Array<{
    id: string;
    name: string;
  }>;
  updatedAt: string;
}

export interface AudioSafetySettings {
  cloneReviewRequired: boolean;
  designReviewRequired: boolean;
  userPublicVoiceEnabled: boolean;
  cloneDefaultVisibility: "PRIVATE" | "PUBLIC" | "ADMIN_ONLY";
  designDefaultVisibility: "PRIVATE" | "PUBLIC" | "ADMIN_ONLY";
  safetyNotice: string;
  cloneConsentText: string;
  downloadNotice: string;
}

export interface VoiceConsent {
  id: string;
  userId: string;
  voiceAssetId: string | null;
  sourceAudioAssetId: string | null;
  consentText: string;
  consentType: "SELF_VOICE" | "AUTHORIZED_VOICE";
  consentTypeName: string;
  ownerName: string | null;
  ownerContact: string | null;
  agreedAt: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AdminOperationLog {
  id: string;
  adminUserId: string | null;
  adminUser: {
    id: string;
    email: string;
    name: string;
  } | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  description: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AdminAudioAsset {
  id: string;
  userId: string;
  type: string;
  typeName: string;
  storageProvider: string;
  url: string | null;
  objectKey: string;
  mimeType: string;
  durationMs: number | null;
  sizeBytes: number;
  sampleRate: number | null;
  channels: number | null;
  createdAt: string;
}

export interface AdminVoiceAsset {
  id: string;
  userId: string;
  user: {
    id: string;
    email: string;
    nickname: string;
  };
  provider: string;
  providerVoiceId: string | null;
  name: string;
  type: "SYSTEM" | "CLONED" | "DESIGNED";
  typeName: string;
  targetModel: string;
  status: string;
  statusName: string;
  visibility: string;
  language: string | null;
  description: string | null;
  previewAudioUrl: string | null;
  sourceAudioAsset: AdminAudioAsset | null;
  sourceSampleFilePath: string | null;
  consent: VoiceConsent | null;
  reviewNote: string | null;
  disabledReason: string | null;
  reviewedAt: string | null;
  deletedAt: string | null;
  taskCount: number;
  recentTasks: Array<{
    id: string;
    type: string;
    typeName: string;
    status: string;
    statusName: string;
    createdAt: string;
  }>;
  recentUsageLogs: AudioUsageLog[];
  operationLogs?: AdminOperationLog[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminSystemVoiceAsset {
  id: string;
  providerVoiceId: string;
  name: string;
  type: "SYSTEM";
  typeName: string;
  targetModel: string;
  supportedModels: string[];
  sourceModels: string[];
  status: "READY" | "DISABLED";
  statusName: string;
  visibility: "PUBLIC";
  language: string;
  languages: string[];
  description: string;
  trait: string;
  scene: string;
  age: string;
  ageCategory: "儿童" | "青年" | "中年" | "老年" | null;
  avatarUrl: string | null;
  ssmlSupported: boolean;
  instructSupported: boolean;
  timestampSupported: boolean;
  previewAudioUrl: string;
  disabledReason: string | null;
  isCustomized: boolean;
  updatedAt: string | null;
  modelHealth?: Array<{
    modelName: string;
    isAvailable: boolean;
    isEnabled: boolean;
    providerStatus: string | null;
    providerName: string | null;
    statusName: string;
    aliases: Array<{
      aliasKey: string;
      displayName: string;
    }>;
  }>;
  operationLogs?: AdminOperationLog[];
}

export interface AdminAudioModel {
  id: string;
  displayName: string;
  modelName: string;
  provider: string;
  providerName: string;
  providerDisplayName: string;
  providerStatus: string;
  region: string | null;
  capabilityTags: string[];
  isEnabled: boolean;
  statusName: string;
  priceMultiplier: number | null;
  pricingRules: AudioPricingRule[];
  aliases: Array<{
    id: string;
    aliasKey: string;
    displayName: string;
    description: string | null;
    updatedAt: string;
  }>;
  defaultPurposes: string[];
  supportsTts: boolean;
  supportsVoiceDesign: boolean;
  supportsVoiceClone: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAudioTask {
  id: string;
  userId: string;
  user: {
    id: string;
    email: string;
    nickname: string;
  } | null;
  type: AudioOperationType;
  typeName: string;
  status: string;
  statusName: string;
  provider: string;
  model: string;
  providerInstanceId: string | null;
  modelInstanceId: string | null;
  voiceAssetId: string | null;
  inputText: string | null;
  inputTextLength: number;
  sourceAudioAssetId: string | null;
  sourceAudioAsset: AdminAudioAsset | null;
  sourceSampleFilePath: string | null;
  outputAudioAssetId: string | null;
  outputAudioAsset: AdminAudioAsset | null;
  estimatedCredits: number;
  actualCredits: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  requestId: string | null;
  providerPayload: unknown;
  voiceAsset: {
    id: string;
    name: string;
    providerVoiceId: string | null;
    targetModel: string;
    status: string;
    visibility: string;
    consent: VoiceConsent | null;
  } | null;
  voiceConsent: VoiceConsent | null;
  reservation: {
    id: string;
    amount: number;
    status: string;
    statusName: string;
    expiresAt: string;
  } | null;
  ledgerEntries: Array<{
    id: string;
    type: string;
    typeName: string;
    amount: number;
    balanceAfter: number;
    relatedTaskId: string | null;
    relatedAudioTaskId: string | null;
    relatedTaskType: string | null;
    operationType: AudioOperationType | null;
    operationTypeName: string | null;
    note: string | null;
    createdAt: string;
  }>;
  usageLogs: AudioUsageLog[];
  operationLogs?: AdminOperationLog[];
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
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

function numberText(formData: FormData, name: string) {
  const value = text(formData, name);

  return value ? Number(value) : 0;
}

function checked(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

function buildQuery(filters: Record<string, string | undefined>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      params.set(key, value);
    }
  }

  const query = params.toString();

  return query ? `?${query}` : "";
}

export async function getAdminAudioPricingRules() {
  return apiFetch<AudioPricingRule[]>("/admin/audio/pricing-rules");
}

export async function getAdminAudioModels() {
  return apiFetch<AdminAudioModel[]>("/admin/audio/models");
}

export async function getAdminAudioSafetySettings() {
  return apiFetch<AudioSafetySettings>("/admin/audio/safety-settings");
}

export async function getAdminVoiceAssets() {
  return apiFetch<AdminVoiceAsset[]>("/admin/audio/voices");
}

export async function getAdminSystemVoiceAssets(filters: {
  keyword?: string;
  status?: string;
  language?: string;
  model?: string;
} = {}) {
  return apiFetch<AdminSystemVoiceAsset[]>(`/admin/audio/system-voices${buildQuery(filters)}`);
}

export async function getAdminSystemVoiceAsset(providerVoiceId: string) {
  return apiFetch<AdminSystemVoiceAsset>(`/admin/audio/system-voices/${providerVoiceId}`);
}

export async function getAdminVoiceAsset(id: string) {
  return apiFetch<AdminVoiceAsset>(`/admin/audio/voices/${id}`);
}

export async function getAdminAudioTasks(filters: { user?: string; status?: string; type?: string }) {
  return apiFetch<AdminAudioTask[]>(`/admin/audio/tasks${buildQuery(filters)}`);
}

export async function getAdminAudioTask(id: string) {
  return apiFetch<AdminAudioTask>(`/admin/audio/tasks/${id}`);
}

export async function getAdminAudioUsageDashboard(filters: {
  from?: string;
  to?: string;
  operationType?: string;
  model?: string;
}) {
  return apiFetch<AudioUsageDashboard>(`/admin/audio/usage${buildQuery(filters)}`);
}

export async function updateAudioModelAction(formData: FormData) {
  const id = text(formData, "id");
  await apiFetch<AdminAudioModel>(`/admin/audio/models/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      isEnabled: checked(formData, "isEnabled"),
      aliasKey: text(formData, "aliasKey") || undefined,
      aliasDisplayName: text(formData, "aliasDisplayName") || undefined,
      aliasDescription: text(formData, "aliasDescription") || undefined
    })
  });

  revalidatePath("/admin/audio/models");
}

export async function createAudioPricingRuleAction(formData: FormData) {
  await apiFetch<AudioPricingRule>("/admin/audio/pricing-rules", {
    method: "POST",
    body: JSON.stringify({
      operationType: text(formData, "operationType"),
      model: text(formData, "model") || "*",
      billingMode: text(formData, "billingMode"),
      creditsPerUnit: numberText(formData, "creditsPerUnit"),
      minimumCredits: numberText(formData, "minimumCredits"),
      modelMultiplier: numberText(formData, "modelMultiplier"),
      isEnabled: checked(formData, "isEnabled")
    })
  });

  revalidatePath("/admin/audio/usage");
  revalidatePath("/admin/audio/pricing");
  revalidatePath("/admin/audio/models");
}

export async function updateAudioPricingRuleAction(formData: FormData) {
  const id = text(formData, "id");
  await apiFetch<AudioPricingRule>(`/admin/audio/pricing-rules/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      billingMode: text(formData, "billingMode"),
      creditsPerUnit: numberText(formData, "creditsPerUnit"),
      minimumCredits: numberText(formData, "minimumCredits"),
      modelMultiplier: numberText(formData, "modelMultiplier"),
      isEnabled: checked(formData, "isEnabled")
    })
  });

  revalidatePath("/admin/audio/usage");
  revalidatePath("/admin/audio/pricing");
  revalidatePath("/admin/audio/models");
}

export async function reviewVoiceAssetAction(formData: FormData) {
  const id = text(formData, "id");
  await apiFetch<AdminVoiceAsset>(`/admin/audio/voices/${id}/review`, {
    method: "PATCH",
    body: JSON.stringify({
      action: text(formData, "action"),
      reason: text(formData, "reason") || undefined
    })
  });

  revalidatePath("/admin/audio/safety");
  revalidatePath("/admin/audio/reviews");
  revalidatePath("/admin/audio/voices");
  revalidatePath(`/admin/audio/voices/${id}`);
}

export async function deleteAdminVoiceAssetAction(formData: FormData) {
  const id = text(formData, "id");
  await apiFetch(`/admin/audio/voices/${id}`, {
    method: "DELETE",
    body: JSON.stringify({
      reason: text(formData, "reason"),
      confirm: checked(formData, "confirm")
    })
  });

  revalidatePath("/admin/audio/safety");
  revalidatePath("/admin/audio/reviews");
  revalidatePath("/admin/audio/voices");
  revalidatePath(`/admin/audio/voices/${id}`);
}

function revalidateVoiceAdminPaths(providerVoiceId?: string) {
  revalidatePath("/admin/audio/voices");
  if (providerVoiceId) {
    revalidatePath(`/admin/audio/voices/system/${providerVoiceId}/edit`);
  }
  revalidatePath("/dashboard/voices");
  revalidatePath("/experience/voice");
  revalidatePath("/tools/text-to-speech");
}

export async function updateAdminSystemVoiceAction(formData: FormData) {
  const providerVoiceId = text(formData, "providerVoiceId");

  await apiFetch<AdminSystemVoiceAsset>(`/admin/audio/system-voices/${providerVoiceId}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: text(formData, "name") || undefined,
      description: text(formData, "description") || undefined,
      trait: text(formData, "trait") || undefined,
      scene: text(formData, "scene") || undefined,
      ageCategory: text(formData, "ageCategory") || undefined,
      status: text(formData, "status") || undefined,
      disabledReason: text(formData, "disabledReason") || undefined
    })
  });

  revalidateVoiceAdminPaths(providerVoiceId);

  const redirectTo = text(formData, "redirectTo");
  if (redirectTo) {
    redirect(redirectTo);
  }
}

export async function toggleAdminSystemVoiceEnabledAction(formData: FormData) {
  const providerVoiceId = text(formData, "providerVoiceId");
  const nextStatus = text(formData, "nextStatus") || "READY";

  await apiFetch<AdminSystemVoiceAsset>(`/admin/audio/system-voices/${providerVoiceId}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: nextStatus,
      disabledReason: nextStatus === "DISABLED" ? "后台停用系统音色" : undefined
    })
  });

  revalidateVoiceAdminPaths(providerVoiceId);
}

export async function deleteAdminSystemVoiceAction(formData: FormData) {
  const providerVoiceId = text(formData, "providerVoiceId");

  await apiFetch<AdminSystemVoiceAsset>(`/admin/audio/system-voices/${providerVoiceId}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "DISABLED",
      disabledReason: "后台删除系统音色（从前台隐藏）"
    })
  });

  revalidateVoiceAdminPaths(providerVoiceId);
}

export async function toggleAdminUserVoiceEnabledAction(formData: FormData) {
  const id = text(formData, "id");
  const action = text(formData, "action") || "APPROVE";

  await apiFetch<AdminVoiceAsset>(`/admin/audio/voices/${id}/review`, {
    method: "PATCH",
    body: JSON.stringify({
      action,
      reason: action === "DISABLE" ? "后台停用音色" : undefined
    })
  });

  revalidatePath("/admin/audio/voices");
  revalidatePath(`/admin/audio/voices/${id}`);
  revalidatePath("/admin/audio/safety");
  revalidatePath("/admin/audio/reviews");
}

export async function deleteAdminUserVoiceQuickAction(formData: FormData) {
  const id = text(formData, "id");

  await apiFetch(`/admin/audio/voices/${id}`, {
    method: "DELETE",
    body: JSON.stringify({
      reason: "后台删除音色",
      confirm: true
    })
  });

  revalidatePath("/admin/audio/voices");
  revalidatePath(`/admin/audio/voices/${id}`);
  revalidatePath("/admin/audio/safety");
  revalidatePath("/admin/audio/reviews");
}
