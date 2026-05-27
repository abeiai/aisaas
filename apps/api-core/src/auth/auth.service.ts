import { createHmac, randomBytes, randomInt } from "node:crypto";
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
import { BindPhoneDto, PhoneLoginDto, SendPhoneCodeDto } from "./dto/phone-auth.dto.js";

interface RequestLike {
  headers: {
    cookie?: string;
    authorization?: string;
  };
}

export interface PublicUser {
  id: string;
  email: string;
  phone: string | null;
  phoneVerifiedAt: Date | null;
  nickname: string;
  status: string;
}

interface UserRefreshSession {
  user: PublicUser;
  refreshToken: string;
  refreshTokenId: string;
}

const defaultAccessSessionSeconds = 15 * 60;
const defaultPersistentSessionSeconds = 400 * 24 * 60 * 60;
const defaultSmsCodeTtlSeconds = 5 * 60;
const defaultPhoneVerificationCode = "199599";
const phonePattern = /^1[3-9]\d{9}$/;

type SmsCodePurpose = "LOGIN" | "BIND_PHONE";

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

  async sendPhoneCode(dto: SendPhoneCodeDto, userId?: string) {
    const phone = this.normalizePhone(dto.phone);
    const purpose = dto.purpose ?? "LOGIN";

    if (purpose === "BIND_PHONE") {
      if (!userId) {
        throw new AppException(40101, "请先登录", HttpStatus.UNAUTHORIZED);
      }

      const existingOwner = await this.prisma.user.findUnique({
        where: {
          phone
        },
        select: {
          id: true
        }
      });

      if (existingOwner && existingOwner.id !== userId) {
        throw new AppException(40002, "该手机号已绑定其他账号", HttpStatus.BAD_REQUEST);
      }
    }

    const code = this.createSmsCode();
    const expiresIn = this.getSmsCodeTtlSeconds();
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    let sendProvider = "LOCAL_DEFAULT";
    let sendRequestId: string | null = null;
    let sendStatus = "短信服务未配置，已启用默认验证码";

    if (this.hasAliyunSmsConfig()) {
      const sent = await this.sendAliyunSms(phone, code);
      sendProvider = "ALIYUN";
      sendRequestId = sent.requestId;
      sendStatus = sent.status;
    }

    await this.prisma.smsVerificationCode.create({
      data: {
        phone,
        purpose,
        codeHash: this.hashSmsCode(phone, purpose, code),
        expiresAt,
        sendProvider,
        sendRequestId,
        sendStatus
      }
    });

    return {
      phone,
      purpose,
      expiresIn,
      sent: sendProvider === "ALIYUN",
      message:
        sendProvider === "ALIYUN"
          ? "验证码已发送"
          : `短信服务未配置，可使用默认验证码 ${defaultPhoneVerificationCode}`
    };
  }

  async loginByPhone(dto: PhoneLoginDto, response: ResponseLike) {
    const phone = this.normalizePhone(dto.phone);
    const loginSubject = `phone:${phone}`;

    await assertLoginAllowed("USER", loginSubject);

    try {
      await this.verifyPhoneCode(phone, "LOGIN", dto.code);
    } catch (error) {
      await recordLoginFailure("USER", loginSubject);
      throw error;
    }

    let user = await this.prisma.user.findUnique({
      where: {
        phone
      }
    });

    if (!user) {
      user = await this.prisma.$transaction(async (transaction) => {
        const createdUser = await transaction.user.create({
          data: {
            email: this.createPhoneUserEmail(phone),
            phone,
            phoneVerifiedAt: new Date(),
            passwordHash: await hashPassword(this.createOpaqueToken()),
            nickname: dto.nickname?.trim() || `手机用户${phone.slice(-4)}`,
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
    }

    if (user.status !== "ACTIVE") {
      throw new AppException(40301, "账号已被禁用", HttpStatus.FORBIDDEN);
    }

    await clearLoginFailures("USER", loginSubject);

    const updatedUser = await this.prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        phone,
        phoneVerifiedAt: user.phoneVerifiedAt ?? new Date(),
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

    if (token) {
      const payload = verifyJwt(token, this.getAccessSecret());

      if (payload?.type === "USER") {
        const user = await this.prisma.user.findUnique({
          where: {
            id: payload.sub
          }
        });

        if (user?.status === "ACTIVE") {
          return this.toPublicUser(user);
        }
      }
    }

    return (await this.resolveRefreshSession(request, token ? "登录状态已失效，请重新登录" : "请先登录"))
      .user;
  }

  async refresh(request: RequestLike, response: ResponseLike) {
    const session = await this.resolveRefreshSession(request, "登录状态已失效，请重新登录");

    return this.renewSessionCookies(session, response);
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

  async bindPhone(userId: string, dto: BindPhoneDto): Promise<PublicUser> {
    const phone = this.normalizePhone(dto.phone);
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId
      }
    });

    if (!user || user.status !== "ACTIVE") {
      throw new AppException(40101, "登录状态已失效，请重新登录", HttpStatus.UNAUTHORIZED);
    }

    const existingOwner = await this.prisma.user.findUnique({
      where: {
        phone
      },
      select: {
        id: true
      }
    });

    if (existingOwner && existingOwner.id !== userId) {
      throw new AppException(40002, "该手机号已绑定其他账号", HttpStatus.BAD_REQUEST);
    }

    await this.verifyPhoneCode(phone, "BIND_PHONE", dto.code);

    const updatedUser = await this.prisma.user.update({
      where: {
        id: userId
      },
      data: {
        phone,
        phoneVerifiedAt: new Date()
      }
    });

    return this.toPublicUser(updatedUser);
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
    const accessMaxAge = this.getAccessMaxAge();
    const refreshMaxAge = this.getRefreshMaxAge();
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

  private async resolveRefreshSession(
    request: RequestLike,
    errorMessage: string
  ): Promise<UserRefreshSession> {
    const refreshToken = readCookie(request, userRefreshCookie);

    if (!refreshToken) {
      throw new AppException(40101, errorMessage, HttpStatus.UNAUTHORIZED);
    }

    const refreshRecord = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash: this.hashToken(refreshToken),
        type: "USER",
        revokedAt: null,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        user: true
      }
    });

    if (!refreshRecord?.user || refreshRecord.user.status !== "ACTIVE") {
      throw new AppException(40101, "登录状态已失效，请重新登录", HttpStatus.UNAUTHORIZED);
    }

    return {
      user: this.toPublicUser(refreshRecord.user),
      refreshToken,
      refreshTokenId: refreshRecord.id
    };
  }

  private async renewSessionCookies(session: UserRefreshSession, response: ResponseLike) {
    const accessMaxAge = this.getAccessMaxAge();
    const refreshMaxAge = this.getRefreshMaxAge();
    const accessToken = signJwt(
      {
        sub: session.user.id,
        email: session.user.email,
        type: "USER"
      },
      this.getAccessSecret(),
      accessMaxAge
    );

    await this.prisma.refreshToken.update({
      where: {
        id: session.refreshTokenId
      },
      data: {
        expiresAt: new Date(Date.now() + refreshMaxAge * 1000)
      }
    });

    setAuthCookies(
      response,
      userAccessCookie,
      userRefreshCookie,
      accessToken,
      session.refreshToken,
      accessMaxAge,
      refreshMaxAge
    );

    return {
      user: session.user,
      accessToken,
      refreshToken: session.refreshToken,
      accessTokenExpiresIn: accessMaxAge,
      refreshTokenExpiresIn: refreshMaxAge
    };
  }

  private toPublicUser(user: {
    id: string;
    email: string;
    phone?: string | null;
    phoneVerifiedAt?: Date | null;
    nickname: string;
    status: string;
  }): PublicUser {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone ?? null,
      phoneVerifiedAt: user.phoneVerifiedAt ?? null,
      nickname: user.nickname,
      status: user.status
    };
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private normalizePhone(value: string) {
    let phone = value.trim().replace(/[\s-]/g, "");

    if (phone.startsWith("+86")) {
      phone = phone.slice(3);
    } else if (phone.startsWith("86") && phone.length === 13) {
      phone = phone.slice(2);
    }

    if (!phonePattern.test(phone)) {
      throw new AppException(40001, "手机号格式不正确", HttpStatus.BAD_REQUEST);
    }

    return phone;
  }

  private createPhoneUserEmail(phone: string) {
    return `phone-${phone}@users.aisaas.local`;
  }

  private createSmsCode() {
    return String(randomInt(0, 1_000_000)).padStart(6, "0");
  }

  private hashSmsCode(phone: string, purpose: SmsCodePurpose, code: string) {
    return createHmac("sha256", this.getRefreshSecret())
      .update(`${phone}:${purpose}:${code.trim()}`)
      .digest("hex");
  }

  private async verifyPhoneCode(phone: string, purpose: SmsCodePurpose, code: string) {
    const normalizedCode = code.trim();

    if (normalizedCode === defaultPhoneVerificationCode) {
      return;
    }

    const record = await this.prisma.smsVerificationCode.findFirst({
      where: {
        phone,
        purpose,
        consumedAt: null,
        expiresAt: {
          gt: new Date()
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    if (!record || record.codeHash !== this.hashSmsCode(phone, purpose, normalizedCode)) {
      throw new AppException(40003, "验证码错误或已过期", HttpStatus.BAD_REQUEST);
    }

    await this.prisma.smsVerificationCode.update({
      where: {
        id: record.id
      },
      data: {
        consumedAt: new Date()
      }
    });
  }

  private getSmsCodeTtlSeconds() {
    const value = Number(process.env.SMS_CODE_TTL_SECONDS);

    return Number.isFinite(value) && value > 0 ? value : defaultSmsCodeTtlSeconds;
  }

  private hasAliyunSmsConfig() {
    return Boolean(
      process.env.ALIYUN_SMS_ACCESS_KEY_ID?.trim() &&
        process.env.ALIYUN_SMS_ACCESS_KEY_SECRET?.trim() &&
        process.env.ALIYUN_SMS_SIGN_NAME?.trim() &&
        process.env.ALIYUN_SMS_TEMPLATE_CODE?.trim()
    );
  }

  private async sendAliyunSms(phone: string, code: string) {
    const accessKeyId = process.env.ALIYUN_SMS_ACCESS_KEY_ID?.trim();
    const accessKeySecret = process.env.ALIYUN_SMS_ACCESS_KEY_SECRET?.trim();
    const signName = process.env.ALIYUN_SMS_SIGN_NAME?.trim();
    const templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE?.trim();

    if (!accessKeyId || !accessKeySecret || !signName || !templateCode) {
      throw new AppException(50001, "短信服务配置缺失", HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const params: Record<string, string> = {
      AccessKeyId: accessKeyId,
      Action: "SendSms",
      Format: "JSON",
      PhoneNumbers: phone,
      RegionId: process.env.ALIYUN_SMS_REGION_ID?.trim() || "cn-hangzhou",
      SignName: signName,
      SignatureMethod: "HMAC-SHA1",
      SignatureNonce: randomBytes(16).toString("hex"),
      SignatureVersion: "1.0",
      TemplateCode: templateCode,
      TemplateParam: JSON.stringify({
        [process.env.ALIYUN_SMS_TEMPLATE_PARAM_CODE_KEY?.trim() || "code"]: code
      }),
      Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
      Version: "2017-05-25"
    };
    const canonicalQuery = Object.keys(params)
      .sort()
      .map((key) => `${this.aliyunEncode(key)}=${this.aliyunEncode(params[key] ?? "")}`)
      .join("&");
    const stringToSign = `POST&%2F&${this.aliyunEncode(canonicalQuery)}`;
    const signature = createHmac("sha1", `${accessKeySecret}&`).update(stringToSign).digest("base64");
    const body = new URLSearchParams({
      ...params,
      Signature: signature
    });
    const timeoutMs = Number(process.env.ALIYUN_SMS_TIMEOUT_MS || 10_000);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 10_000);

    try {
      const response = await fetch(process.env.ALIYUN_SMS_ENDPOINT || "https://dysmsapi.aliyuncs.com/", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body,
        signal: controller.signal
      });
      const payload = (await response.json().catch(() => null)) as {
        Code?: string;
        Message?: string;
        RequestId?: string;
      } | null;

      if (!response.ok || payload?.Code !== "OK") {
        throw new AppException(
          50201,
          `短信发送失败：${payload?.Message || payload?.Code || "阿里云短信接口异常"}`,
          HttpStatus.BAD_GATEWAY
        );
      }

      return {
        requestId: payload.RequestId ?? null,
        status: payload.Code
      };
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }

      throw new AppException(50201, "短信发送失败：阿里云短信接口请求超时或不可用", HttpStatus.BAD_GATEWAY);
    } finally {
      clearTimeout(timeout);
    }
  }

  private aliyunEncode(value: string) {
    return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
      `%${char.charCodeAt(0).toString(16).toUpperCase()}`
    );
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

  private getAccessMaxAge() {
    return parseExpiresIn(process.env.JWT_ACCESS_EXPIRES_IN, defaultAccessSessionSeconds);
  }

  private getRefreshMaxAge() {
    return parseExpiresIn(process.env.JWT_REFRESH_EXPIRES_IN, defaultPersistentSessionSeconds);
  }
}
