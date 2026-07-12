"use server";

import { adminApiFetch } from "@/lib/admin-api-fetch";

export interface OperationLogAdmin {
  id: string;
  email: string;
  name: string;
  role: string;
  status?: string;
}

export interface OperationLog {
  id: string;
  adminUserId: string | null;
  adminUser: OperationLogAdmin | null;
  action: string;
  actionName: string;
  resourceType: string;
  resourceId: string | null;
  description: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface OperationLogFilters {
  adminUserId?: string;
  resourceType?: string;
  resourceId?: string;
  startedAt?: string;
  endedAt?: string;
}

async function apiFetch<TData>(path: string, init: RequestInit = {}) {
  return adminApiFetch<TData>(path, init);
}

function buildQuery(filters: OperationLogFilters = {}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      params.set(key, value);
    }
  }

  const query = params.toString();

  return query ? `?${query}` : "";
}

export async function getAdminOperationLogs(filters: OperationLogFilters = {}) {
  return apiFetch<OperationLog[]>(`/admin/operation-logs${buildQuery(filters)}`);
}

export async function getOperationLogAdmins() {
  return apiFetch<OperationLogAdmin[]>("/admin/operation-logs/admins");
}
