"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

interface ApiResponse<TData> {
  code: number;
  message: string;
  data: TData;
}

export interface MediaAsset {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  storageProvider: "LOCAL" | "S3";
  createdByAdminId: string | null;
  createdByAdmin: {
    id: string;
    email: string;
    name: string;
  } | null;
  createdAt: string;
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

export async function getAdminMediaAssets() {
  return apiFetch<MediaAsset[]>("/media/admin/assets");
}

export async function uploadMediaAction(formData: FormData) {
  const headers = new Headers();
  headers.set("Cookie", await getCookieHeader());

  const response = await fetch(`${getApiBaseUrl()}/media/admin/upload`, {
    method: "POST",
    headers,
    body: formData,
    cache: "no-store"
  });
  const payload = (await response.json()) as ApiResponse<MediaAsset | null>;

  if (!response.ok || payload.code !== 0 || payload.data === null) {
    throw new Error(payload.message || "上传失败");
  }

  revalidatePath("/admin");
  revalidatePath("/admin/media");
  revalidatePath("/admin/articles");
  revalidatePath("/admin/pages");
}
