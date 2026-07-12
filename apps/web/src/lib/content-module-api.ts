"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { adminApiFetch } from "@/lib/admin-api-fetch";

export type ContentModuleType = "SLIDESHOW" | "IMAGE_CARD_LIST" | "SPLIT_IMAGE_TEXT";
export type ContentModuleLinkType = "NONE" | "CATEGORY" | "PAGE" | "ARTICLE" | "EXTERNAL";

export interface ContentModuleItem {
  id: string;
  moduleId: string;
  title: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  linkType: ContentModuleLinkType | string | null;
  linkTarget: string | null;
  resolvedHref?: string;
  config: Record<string, unknown>;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContentModule {
  id: string;
  name: string;
  slug: string;
  type: ContentModuleType;
  description: string | null;
  settings: Record<string, unknown>;
  isEnabled: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  items: ContentModuleItem[];
  _count?: {
    items: number;
  };
}

async function apiFetch<TData>(path: string, init: RequestInit = {}) {
  return adminApiFetch<TData>(path, init);
}

export async function getAdminContentModules(type?: ContentModuleType) {
  const query = type ? `?type=${encodeURIComponent(type)}` : "";

  return apiFetch<ContentModule[]>(`/content-modules${query}`);
}

export async function getAdminContentModule(id: string) {
  return apiFetch<ContentModule>(`/content-modules/${id}`);
}

export async function deleteContentModuleAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  if (id) {
    await apiFetch(`/content-modules/${id}`, {
      method: "DELETE"
    });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/modules");
  redirect("/admin/modules");
}
