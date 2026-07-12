"use server";

import { adminApiFetch } from "@/lib/admin-api-fetch";

export interface MediaAsset {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  mediaType: MediaAssetType;
  sourceType: MediaAssetSource;
  storageProvider: "LOCAL" | "S3";
  createdByAdminId: string | null;
  createdByAdmin: {
    id: string;
    email: string;
    name: string;
  } | null;
  createdAt: string;
}

export type MediaAssetType = "IMAGE" | "AUDIO" | "VIDEO";
export type MediaAssetSource = "SYSTEM" | "USER_UPLOAD" | "AI_GENERATED" | "WEB_FETCHED";

interface MediaAssetFilters {
  mediaType?: MediaAssetType;
  sourceType?: MediaAssetSource;
  q?: string;
}

async function apiFetch<TData>(path: string, init: RequestInit = {}) {
  return adminApiFetch<TData>(path, init);
}

export async function getAdminMediaAssets(filters: MediaAssetFilters = {}) {
  const searchParams = new URLSearchParams();

  if (filters.mediaType) {
    searchParams.set("mediaType", filters.mediaType);
  }

  if (filters.sourceType) {
    searchParams.set("sourceType", filters.sourceType);
  }

  if (filters.q?.trim()) {
    searchParams.set("q", filters.q.trim());
  }

  const query = searchParams.toString();

  return apiFetch<MediaAsset[]>(`/media/admin/assets${query ? `?${query}` : ""}`);
}
