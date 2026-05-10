import { createHmac, randomBytes } from "node:crypto";
import { HttpStatus, Injectable } from "@nestjs/common";
import { getPrismaClient, verifyPassword } from "@aisaas/database";
import { AppException } from "../common/app-exception.js";
import { writeAdminOperationLog } from "../security/admin-operation-log.js";
import {
  adminAccessCookie,
  adminRefreshCookie,
  clearAuthCookies,
  readBearerToken,
  readCookie,
  setAuthCookies,
  type ResponseLike
} from "../security/cookies.js";
import { parseExpiresIn, signJwt, verifyJwt } from "../security/jwt.js";
import {
  assertLoginAllowed,
  clearLoginFailures,
  recordLoginFailure
} from "../security/login-protection.js";
import type { HeaderRequestLike } from "../security/request-types.js";
import { AdminLoginDto } from "./dto/admin-login.dto.js";

interface RequestLike {
  headers: {
    cookie?: string;
    authorization?: string;
  };
}

export interface PublicAdmin {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
}

@Injectable()
export class AdminAuthService {
  private readonly prisma = getPrismaClient();

  async login(dto: AdminLoginDto, response: ResponseLike, request?: HeaderRequestLike) {
    const email = dto.email.trim().toLowerCase();

    await assertLoginAllowed("ADMIN", email);

    const admin = await this.prisma.adminUser.findUnique({
      where: {
        email
      }
    });

    if (!admin || !(await verifyPassword(dto.password, admin.passwordHash))) {
      await recordLoginFailure("ADMIN", email);
      throw new AppException(40003, "管理员邮箱或密码错误", HttpStatus.BAD_REQUEST);
    }

    if (admin.status !== "ACTIVE") {
      throw new AppException(40301, "管理员账号已被禁用", HttpStatus.FORBIDDEN);
    }

    await clearLoginFailures("ADMIN", email);

    const session = await this.createAdminSession(this.toPublicAdmin(admin), response);

    await writeAdminOperationLog({
      adminUserId: admin.id,
      action: "ADMIN_LOGIN",
      resourceType: "ADMIN_USER",
      resourceId: admin.id,
      description: "管理员登录后台",
      request
    });

    return session;
  }

  async logout(request: RequestLike, response: ResponseLike) {
    const refreshToken = readCookie(request, adminRefreshCookie);

    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: {
          tokenHash: this.hashToken(refreshToken),
          type: "ADMIN",
          revokedAt: null
        },
        data: {
          revokedAt: new Date()
        }
      });
    }

    clearAuthCookies(response, adminAccessCookie, adminRefreshCookie);

    return {};
  }

  async me(request: RequestLike): Promise<PublicAdmin> {
    const token = readCookie(request, adminAccessCookie) ?? readBearerToken(request);

    if (!token) {
      throw new AppException(40101, "请先登录管理员账号", HttpStatus.UNAUTHORIZED);
    }

    const payload = verifyJwt(token, this.getAccessSecret());

    if (!payload || payload.type !== "ADMIN") {
      throw new AppException(40101, "管理员登录状态已失效，请重新登录", HttpStatus.UNAUTHORIZED);
    }

    const admin = await this.prisma.adminUser.findUnique({
      where: {
        id: payload.sub
      }
    });

    if (!admin || admin.status !== "ACTIVE") {
      throw new AppException(40101, "管理员登录状态已失效，请重新登录", HttpStatus.UNAUTHORIZED);
    }

    return this.toPublicAdmin(admin);
  }

  private async createAdminSession(admin: PublicAdmin, response: ResponseLike) {
    const accessMaxAge = parseExpiresIn(process.env.JWT_ACCESS_EXPIRES_IN, 15 * 60);
    const refreshMaxAge = parseExpiresIn(process.env.JWT_REFRESH_EXPIRES_IN, 7 * 24 * 60 * 60);
    const accessToken = signJwt(
      {
        sub: admin.id,
        email: admin.email,
        type: "ADMIN"
      },
      this.getAccessSecret(),
      accessMaxAge
    );
    const refreshToken = this.createOpaqueToken();

    await this.prisma.refreshToken.create({
      data: {
        adminUserId: admin.id,
        tokenHash: this.hashToken(refreshToken),
        type: "ADMIN",
        expiresAt: new Date(Date.now() + refreshMaxAge * 1000)
      }
    });

    setAuthCookies(
      response,
      adminAccessCookie,
      adminRefreshCookie,
      accessToken,
      refreshToken,
      accessMaxAge,
      refreshMaxAge
    );

    return {
      admin,
      accessToken,
      refreshToken,
      accessTokenExpiresIn: accessMaxAge,
      refreshTokenExpiresIn: refreshMaxAge
    };
  }

  private toPublicAdmin(admin: {
    id: string;
    email: string;
    name: string;
    role: string;
    status: string;
  }): PublicAdmin {
    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      status: admin.status
    };
  }

  private getAccessSecret() {
    const secret = process.env.JWT_ACCESS_SECRET;

    if (!secret) {
      throw new AppException(50001, "认证服务配置缺失", HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return secret;
  }

  private createOpaqueToken() {
    return randomBytes(48).toString("base64url");
  }

  private hashToken(token: string) {
    return createHmac("sha256", this.getRefreshSecret()).update(token).digest("hex");
  }

  private getRefreshSecret() {
    const secret = process.env.JWT_REFRESH_SECRET;

    if (!secret) {
      throw new AppException(50001, "认证服务配置缺失", HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return secret;
  }
}
