import { cookies } from "next/headers";
import { redirect } from "next/navigation";

interface ApiResponse<TData> {
  code: number;
  message: string;
  data: TData;
}

interface AdminApiFetchOptions {
  allowNull?: boolean;
}

export function getCoreApiBaseUrl() {
  return process.env.API_BASE_URL ?? "http://localhost:7342/api";
}

async function getCookieHeader() {
  const cookieStore = await cookies();

  return cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${encodeURIComponent(cookie.value)}`)
    .join("; ");
}

function isAdminAuthError(response: Response, payload: ApiResponse<unknown>) {
  if (response.status === 401 || response.status === 403) {
    return true;
  }

  return (
    payload.code === 40101 ||
    payload.message.includes("管理员登录状态") ||
    payload.message.includes("请先登录管理员账号")
  );
}

export async function adminApiFetch<TData>(
  path: string,
  init: RequestInit = {},
  options: AdminApiFetchOptions = {}
) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Cookie", await getCookieHeader());

  const response = await fetch(`${getCoreApiBaseUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store"
  });
  const payload = (await response.json()) as ApiResponse<TData | null>;

  if (!response.ok || payload.code !== 0 || (payload.data === null && !options.allowNull)) {
    if (isAdminAuthError(response, payload)) {
      redirect("/admin/login");
    }

    throw new Error(payload.message || "请求失败");
  }

  return payload.data as TData;
}
