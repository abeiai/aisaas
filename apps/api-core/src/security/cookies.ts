interface RequestLike {
  headers: {
    cookie?: string;
    authorization?: string;
  };
}

export interface ResponseLike {
  cookie(name: string, value: string, options: Record<string, unknown>): void;
  clearCookie(name: string, options: Record<string, unknown>): void;
}

export const userAccessCookie = "aisaas_user_access";
export const userRefreshCookie = "aisaas_user_refresh";
export const adminAccessCookie = "aisaas_admin_access";
export const adminRefreshCookie = "aisaas_admin_refresh";

export function readCookie(request: RequestLike, name: string) {
  const cookieHeader = request.headers.cookie;

  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const cookie = cookies.find((item) => item.startsWith(`${name}=`));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.slice(name.length + 1));
}

export function readBearerToken(request: RequestLike) {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length);
}

export function setAuthCookies(
  response: ResponseLike,
  accessCookieName: string,
  refreshCookieName: string,
  accessToken: string,
  refreshToken: string,
  accessMaxAge: number,
  refreshMaxAge: number
) {
  const baseOptions = {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  };

  response.cookie(accessCookieName, accessToken, {
    ...baseOptions,
    maxAge: accessMaxAge * 1000
  });
  response.cookie(refreshCookieName, refreshToken, {
    ...baseOptions,
    maxAge: refreshMaxAge * 1000
  });
}

export function clearAuthCookies(
  response: ResponseLike,
  accessCookieName: string,
  refreshCookieName: string
) {
  const options = {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  };

  response.clearCookie(accessCookieName, options);
  response.clearCookie(refreshCookieName, options);
}
