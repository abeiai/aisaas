"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

interface ApiResponse<TData> {
  code: number;
  message: string;
  data: TData;
}

export interface SystemConfig {
  id: string;
  key: string;
  label: string;
  value: string;
  description: string | null;
  group: string;
  isPublic: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
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

async function publicApiFetch<TData>(path: string) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: {
      "Content-Type": "application/json"
    },
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

export async function getAdminSystemConfigs() {
  return apiFetch<SystemConfig[]>("/system-config");
}

export async function getPublicSystemConfigs() {
  return publicApiFetch<SystemConfig[]>("/system-config/public");
}

export async function updateSystemConfigAction(formData: FormData) {
  await apiFetch<SystemConfig[]>("/system-config", {
    method: "PATCH",
    body: JSON.stringify({
      siteName: text(formData, "siteName"),
      siteLogo: text(formData, "siteLogo"),
      themePrimaryColor: text(formData, "themePrimaryColor"),
      publicNavItems: text(formData, "publicNavItems"),
      footerText: text(formData, "footerText"),
      homeTitle: text(formData, "homeTitle"),
      homeDescription: text(formData, "homeDescription"),
      homeCtaText: text(formData, "homeCtaText"),
      homeCtaHref: text(formData, "homeCtaHref"),
      homeFeatureHighlights: text(formData, "homeFeatureHighlights"),
      homeLatestArticleCount: text(formData, "homeLatestArticleCount"),
      seoTitle: text(formData, "seoTitle"),
      seoDescription: text(formData, "seoDescription"),
      beianNo: text(formData, "beianNo"),
      serviceQrCode: text(formData, "serviceQrCode"),
      defaultCreditExchangeRate: text(formData, "defaultCreditExchangeRate"),
      siteUrl: text(formData, "siteUrl"),
      siteDescription: text(formData, "siteDescription"),
      apiBaseUrl: text(formData, "apiBaseUrl"),
      registrationStatus: text(formData, "registrationStatus"),
      mediaImageMaxSizeMb: text(formData, "mediaImageMaxSizeMb"),
      mediaAudioMaxSizeMb: text(formData, "mediaAudioMaxSizeMb"),
      mediaVideoMaxSizeMb: text(formData, "mediaVideoMaxSizeMb")
    })
  });

  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
  revalidatePath("/robots.txt");
}

export async function updateAiConfigAction(formData: FormData) {
  await apiFetch<SystemConfig[]>("/system-config", {
    method: "PATCH",
    body: JSON.stringify({
      defaultAiModel: text(formData, "defaultAiModel"),
      aiSaveFullContent: text(formData, "aiSaveFullContent"),
      audioVoiceCloneReviewRequired: text(formData, "audioVoiceCloneReviewRequired"),
      audioVoiceDesignReviewRequired: text(formData, "audioVoiceDesignReviewRequired"),
      audioUserPublicVoiceEnabled: text(formData, "audioUserPublicVoiceEnabled"),
      audioCloneDefaultVisibility: text(formData, "audioCloneDefaultVisibility"),
      audioDesignDefaultVisibility: text(formData, "audioDesignDefaultVisibility"),
      audioSafetyNotice: text(formData, "audioSafetyNotice"),
      audioCloneConsentText: text(formData, "audioCloneConsentText"),
      audioDownloadNotice: text(formData, "audioDownloadNotice")
    })
  });

  revalidatePath("/admin");
  revalidatePath("/admin/ai/config");
  revalidatePath("/tools/voice-clone");
  revalidatePath("/tools/voice-design");
  revalidatePath("/dashboard/voices");
  revalidatePath("/dashboard/audio-tasks");
  revalidatePath("/admin/audio/safety");
}
