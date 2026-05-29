"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export interface AuthActionState {
  error?: string;
  success?: string;
}

interface ApiResponse<TData> {
  code: number;
  message: string;
  data: TData;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
}

export interface PublicUser {
  id: string;
  email: string;
  phone: string | null;
  phoneVerifiedAt: string | null;
  nickname: string;
  status: string;
}

export interface PublicAdmin {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
}

const userAccessCookie = "aisaas_user_access";
const userRefreshCookie = "aisaas_user_refresh";
const adminAccessCookie = "aisaas_admin_access";
const adminRefreshCookie = "aisaas_admin_refresh";

function getApiBaseUrl() {
  return process.env.API_BASE_URL ?? "http://localhost:7342/api";
}

function shouldUseSecureCookies() {
  const appBaseUrl = process.env.APP_BASE_URL?.trim().toLowerCase();

  if (appBaseUrl) {
    return appBaseUrl.startsWith("https://");
  }

  return process.env.NODE_ENV === "production";
}

async function getCookieHeader() {
  const cookieStore = await cookies();

  return cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${encodeURIComponent(cookie.value)}`)
    .join("; ");
}

async function postJson<TData>(path: string, body: Record<string, string>) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body),
    cache: "no-store"
  });
  const payload = (await response.json()) as ApiResponse<TData | null>;

  if (!response.ok || payload.code !== 0 || !payload.data) {
    return {
      ok: false as const,
      message: payload.message || "请求失败"
    };
  }

  return {
    ok: true as const,
    data: payload.data
  };
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

function safeNextPath(value: FormDataEntryValue | string | null, fallback = "/dashboard") {
  const next = typeof value === "string" ? value.trim() : "";

  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/admin")) {
    return fallback;
  }

  return next;
}

async function setSessionCookies(
  accessCookieName: string,
  refreshCookieName: string,
  tokens: AuthTokens
) {
  const cookieStore = await cookies();
  const baseOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: shouldUseSecureCookies(),
    path: "/"
  };

  cookieStore.set(accessCookieName, tokens.accessToken, {
    ...baseOptions,
    maxAge: tokens.accessTokenExpiresIn
  });
  cookieStore.set(refreshCookieName, tokens.refreshToken, {
    ...baseOptions,
    maxAge: tokens.refreshTokenExpiresIn
  });
}

async function clearSessionCookies(accessCookieName: string, refreshCookieName: string) {
  const cookieStore = await cookies();
  cookieStore.delete(accessCookieName);
  cookieStore.delete(refreshCookieName);
}

export async function userLoginAction(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(formData.get("next"));

  let result: Awaited<ReturnType<typeof postJson<AuthTokens>>>;

  try {
    result = await postJson<AuthTokens>("/auth/login", { email, password });
  } catch {
    return { error: "认证服务暂不可用，请稍后再试" };
  }

  if (!result.ok) {
    return { error: result.message };
  }

  await setSessionCookies(userAccessCookie, userRefreshCookie, result.data);
  redirect(next);
}

export async function registerAction(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const nickname = String(formData.get("nickname") ?? "");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(formData.get("next"));

  let result: Awaited<ReturnType<typeof postJson<AuthTokens>>>;

  try {
    result = await postJson<AuthTokens>("/auth/register", { nickname, email, password });
  } catch {
    return { error: "认证服务暂不可用，请稍后再试" };
  }

  if (!result.ok) {
    return { error: result.message };
  }

  await setSessionCookies(userAccessCookie, userRefreshCookie, result.data);
  redirect(next);
}

export async function sendLoginPhoneCodeAction(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const phone = String(formData.get("phone") ?? "").trim();
  const purpose = String(formData.get("purpose") ?? "LOGIN") || "LOGIN";

  try {
    const result = await postJson<{ message: string }>("/auth/phone-code", {
      phone,
      purpose
    });

    if (!result.ok) {
      return { error: result.message };
    }

    return { success: result.data.message || "验证码已发送" };
  } catch {
    return { error: "短信服务暂不可用，请稍后再试" };
  }
}

export async function phoneLoginAction(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const phone = String(formData.get("phone") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const nickname = String(formData.get("nickname") ?? "").trim();
  const next = safeNextPath(formData.get("next"));

  let result: Awaited<ReturnType<typeof postJson<AuthTokens>>>;

  try {
    result = await postJson<AuthTokens>("/auth/phone-login", { phone, code, nickname });
  } catch {
    return { error: "认证服务暂不可用，请稍后再试" };
  }

  if (!result.ok) {
    return { error: result.message };
  }

  await setSessionCookies(userAccessCookie, userRefreshCookie, result.data);
  redirect(next);
}

export async function getCurrentUser() {
  try {
    return await apiFetch<PublicUser>("/auth/me");
  } catch {
    redirect("/login");
  }
}

export async function getOptionalCurrentUser() {
  try {
    return await apiFetch<PublicUser>("/auth/me");
  } catch {
    return null;
  }
}

export async function getCurrentAdmin() {
  try {
    return await apiFetch<PublicAdmin>("/admin-auth/me");
  } catch {
    redirect("/admin/login");
  }
}

export async function updateProfileAction(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const nickname = String(formData.get("nickname") ?? "").trim();

  try {
    await apiFetch<PublicUser>("/auth/profile", {
      method: "PATCH",
      body: JSON.stringify({
        nickname
      })
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "资料保存失败" };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  return { success: "资料已保存" };
}

export async function sendBindPhoneCodeAction(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const phone = String(formData.get("phone") ?? "").trim();

  try {
    const result = await apiFetch<{ message: string }>("/auth/phone-code", {
      method: "POST",
      body: JSON.stringify({
        phone,
        purpose: "BIND_PHONE"
      })
    });

    return { success: result.message || "验证码已发送" };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "验证码发送失败" };
  }
}

export async function bindPhoneAction(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const phone = String(formData.get("phone") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();

  try {
    await apiFetch<PublicUser>("/auth/phone", {
      method: "PATCH",
      body: JSON.stringify({
        phone,
        code
      })
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "手机号绑定失败" };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  return { success: "手机号已绑定" };
}

export async function changePasswordAction(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");

  try {
    await apiFetch("/auth/password", {
      method: "PATCH",
      body: JSON.stringify({
        currentPassword,
        newPassword
      })
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "密码修改失败" };
  }

  return { success: "密码已修改，下次登录请使用新密码" };
}

export async function userLogoutAction() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(userAccessCookie)?.value;
  const refreshToken = cookieStore.get(userRefreshCookie)?.value;

  try {
    await fetch(`${getApiBaseUrl()}/auth/logout`, {
      method: "POST",
      headers: {
        Cookie: `${userAccessCookie}=${accessToken ?? ""}; ${userRefreshCookie}=${refreshToken ?? ""}`
      },
      cache: "no-store"
    });
  } catch {
    // 本地 cookie 仍会清理，避免用户卡在已登录状态。
  }

  await clearSessionCookies(userAccessCookie, userRefreshCookie);
  redirect("/");
}

export async function adminLoginAction(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  let result: Awaited<ReturnType<typeof postJson<AuthTokens>>>;

  try {
    result = await postJson<AuthTokens>("/admin-auth/login", { email, password });
  } catch {
    return { error: "认证服务暂不可用，请稍后再试" };
  }

  if (!result.ok) {
    return { error: result.message };
  }

  await setSessionCookies(adminAccessCookie, adminRefreshCookie, result.data);
  redirect("/admin");
}

export async function adminLogoutAction() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(adminAccessCookie)?.value;
  const refreshToken = cookieStore.get(adminRefreshCookie)?.value;

  try {
    await fetch(`${getApiBaseUrl()}/admin-auth/logout`, {
      method: "POST",
      headers: {
        Cookie: `${adminAccessCookie}=${accessToken ?? ""}; ${adminRefreshCookie}=${refreshToken ?? ""}`
      },
      cache: "no-store"
    });
  } catch {
    // 本地 cookie 仍会清理，避免管理员卡在已登录状态。
  }

  await clearSessionCookies(adminAccessCookie, adminRefreshCookie);
  redirect("/admin/login");
}
