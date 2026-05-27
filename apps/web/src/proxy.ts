import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPageNavigation = request.method === "GET" || request.method === "HEAD";

  if (pathname.startsWith("/admin") && pathname !== "/admin/login" && pathname !== "/admin/setup") {
    const setupStatus = pathname === "/admin/system/env-check" ? null : await readSetupStatus(request);

    if (setupStatus && !setupStatus.isInitialized) {
      return NextResponse.redirect(new URL("/admin/setup", request.url));
    }

    const adminAccessToken = request.cookies.get("aisaas_admin_access")?.value;
    const adminRefreshToken = request.cookies.get("aisaas_admin_refresh")?.value;

    if (!adminAccessToken && !adminRefreshToken && isPageNavigation) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  if (pathname.startsWith("/dashboard")) {
    const userAccessToken = request.cookies.get("aisaas_user_access")?.value;
    const userRefreshToken = request.cookies.get("aisaas_user_refresh")?.value;

    if (!userAccessToken && !userRefreshToken && isPageNavigation) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*", "/admin/:path*"]
};

async function readSetupStatus(request: NextRequest) {
  try {
    const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:7342/api";
    const response = await fetch(`${apiBaseUrl}/setup/status`, {
      headers: {
        Cookie: request.headers.get("cookie") ?? ""
      },
      cache: "no-store"
    });
    const payload = (await response.json()) as {
      code?: number;
      data?: {
        isInitialized?: boolean;
      };
    };

    if (!response.ok || payload.code !== 0 || typeof payload.data?.isInitialized !== "boolean") {
      return null;
    }

    return {
      isInitialized: payload.data.isInitialized
    };
  } catch {
    return null;
  }
}
