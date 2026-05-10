import { createHmac, randomBytes } from "node:crypto";
import { HttpStatus, Injectable } from "@nestjs/common";
import { getPrismaClient, hashPassword, verifyPassword } from "@aisaas/database";
import { AppException } from "../common/app-exception.js";
import {
  assertLoginAllowed,
  clearLoginFailures,
  recordLoginFailure
} from "../security/login-protection.js";
import {
  clearAuthCookies,
  readBearerToken,
  readCookie,
  setAuthCookies,
  userAccessCookie,
  userRefreshCookie,
  type ResponseLike
} from "../security/cookies.js";
import { parseExpiresIn, signJwt, verifyJwt } from "../security/jwt.js";
import { LoginDto } from "./dto/login.dto.js";
import { RegisterDto } from "./dto/register.dto.js";
import { ChangePasswordDto } from "./dto/change-password.dto.js";
import { UpdateProfileDto } from "./dto/update-profile.dto.js";

interface RequestLike {
  headers: {
    cookie?: string;
    authorization?: string;
  };
}

export interface PublicUser {
  id: string;
  email: string;
  nickname: string;
  status: string;
}

@Injectable()
export class AuthService {
  private readonly prisma = getPrismaClient();

  async register(dto: RegisterDto, response: ResponseLike) {
    const email = this.normalizeEmail(dto.email);
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email
      }
    });

    if (existingUser) {
      throw new AppException(40002, "该邮箱已注册", HttpStatus.BAD_REQUEST);
    }

    const user = await this.prisma.$transaction(async (transaction) => {
      const createdUser = await transaction.user.create({
        data: {
          email,
          passwordHash: await hashPassword(dto.password),
          nickname: dto.nickname?.trim() || email.split("@")[0] || "新用户",
          lastLoginAt: new Date()
        }
      });

      await transaction.wallet.create({
        data: {
          userId: createdUser.id
        }
      });

      return createdUser;
    });

    return this.createUserSession(this.toPublicUser(user), response);
  }

  async login(dto: LoginDto, response: ResponseLike) {
    const email = this.normalizeEmail(dto.email);

    await assertLoginAllowed("USER", email);

    const user = await this.prisma.user.findUnique({
      where: {
        email
      }
    });

    if (!user || !(await verifyPassword(dto.password, user.passwordHash))) {
      await recordLoginFailure("USER", email);
      throw new AppException(40003, "邮箱或密码错误", HttpStatus.BAD_REQUEST);
    }

    if (user.status !== "ACTIVE") {
      throw new AppException(40301, "账号已被禁用", HttpStatus.FORBIDDEN);
    }

    await clearLoginFailures("USER", email);

    const updatedUser = await this.prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        lastLoginAt: new Date()
      }
    });

    return this.createUserSession(this.toPublicUser(updatedUser), response);
  }

  async logout(request: RequestLike, response: ResponseLike) {
    const refreshToken = readCookie(request, userRefreshCookie);

    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: {
          tokenHash: this.hashToken(refreshToken),
          type: "USER",
          revokedAt: null
        },
        data: {
          revokedAt: new Date()
        }
      });
    }

    clearAuthCookies(response, userAccessCookie, userRefreshCookie);

    return {};
  }

  async me(request: RequestLike): Promise<PublicUser> {
    const token = readCookie(request, userAccessCookie) ?? readBearerToken(request);
    const secret = this.getAccessSecret();

    if (!token) {
      throw new AppException(40101, "请先登录", HttpStatus.UNAUTHORIZED);
    }

    const payload = verifyJwt(token, secret);

    if (!payload || payload.type !== "USER") {
      throw new AppException(40101, "登录状态已失效，请重新登录", HttpStatus.UNAUTHORIZED);
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: payload.sub
      }
    });

    if (!user || user.status !== "ACTIVE") {
      throw new AppException(40101, "登录状态已失效，请重新登录", HttpStatus.UNAUTHORIZED);
    }

    return this.toPublicUser(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<PublicUser> {
    const nickname = dto.nickname?.trim();

    if (!nickname) {
      throw new AppException(40001, "昵称不能为空", HttpStatus.BAD_REQUEST);
    }

    const user = await this.prisma.user.update({
      where: {
        id: userId
      },
      data: {
        nickname
      }
    });

    if (user.status !== "ACTIVE") {
      throw new AppException(40101, "登录状态已失效，请重新登录", HttpStatus.UNAUTHORIZED);
    }

    return this.toPublicUser(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId
      }
    });

    if (!user || user.status !== "ACTIVE") {
      throw new AppException(40101, "登录状态已失效，请重新登录", HttpStatus.UNAUTHORIZED);
    }

    if (!(await verifyPassword(dto.currentPassword, user.passwordHash))) {
      throw new AppException(40003, "当前密码错误", HttpStatus.BAD_REQUEST);
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: {
          id: userId
        },
        data: {
          passwordHash: await hashPassword(dto.newPassword)
        }
      }),
      this.prisma.refreshToken.updateMany({
        where: {
          userId,
          type: "USER",
          revokedAt: null
        },
        data: {
          revokedAt: new Date()
        }
      })
    ]);

    return {};
  }

  private async createUserSession(user: PublicUser, response: ResponseLike) {
    const accessMaxAge = parseExpiresIn(process.env.JWT_ACCESS_EXPIRES_IN, 15 * 60);
    const refreshMaxAge = parseExpiresIn(process.env.JWT_REFRESH_EXPIRES_IN, 7 * 24 * 60 * 60);
    const accessToken = signJwt(
      {
        sub: user.id,
        email: user.email,
        type: "USER"
      },
      this.getAccessSecret(),
      accessMaxAge
    );
    const refreshToken = this.createOpaqueToken();

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        type: "USER",
        expiresAt: new Date(Date.now() + refreshMaxAge * 1000)
      }
    });

    setAuthCookies(
      response,
      userAccessCookie,
      userRefreshCookie,
      accessToken,
      refreshToken,
      accessMaxAge,
      refreshMaxAge
    );

    return {
      user,
      accessToken,
      refreshToken,
      accessTokenExpiresIn: accessMaxAge,
      refreshTokenExpiresIn: refreshMaxAge
    };
  }

  private toPublicUser(user: {
    id: string;
    email: string;
    nickname: string;
    status: string;
  }): PublicUser {
    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      status: user.status
    };
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
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
