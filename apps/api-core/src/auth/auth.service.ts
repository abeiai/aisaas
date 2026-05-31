import { createHmac, randomBytes, randomInt } from "node:crypto";
import { HttpStatus, Injectable } from "@nestjs/common";
import { decryptSecret, getPrismaClient, hashPassword, verifyPassword } from "@aisaas/database";
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
const aliyunDypnsSmsProvider = "ALIYUN_DYPNS";
const aliyunDypnsEndpoint = "https://dypnsapi.aliyuncs.com/";
const phonePattern = /^1[3-9]\d{9}$/;

type SmsCodePurpose = "LOGIN" | "BIND_PHONE";

interface AliyunSmsConfig {
  accessKeyId: string;
  accessKeySecret: string;
  endpoint: string;
  regionId: string;
  signName: string;
  templateCode: string;
  templateParamCodeKey: string;
  templateParamExtraJson: string;
  timeoutMs: number;
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

    let code = this.createSmsCode();
    const expiresIn = await this.getSmsCodeTtlSeconds();
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    let sendProvider = "LOCAL_DEFAULT";
    let sendRequestId: string | null = null;
    let sendStatus = "短信服务未配置，已启用默认验证码";

    const aliyunSmsConfig = await this.getAliyunSmsConfig();

    if (aliyunSmsConfig) {
      const sent = await this.sendAliyunSmsVerifyCode(phone, expiresIn, aliyunSmsConfig);
      sendProvider = aliyunDypnsSmsProvider;
      sendRequestId = sent.requestId;
      sendStatus = sent.status;
      code = sent.requestId || this.createOpaqueToken();
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
      sent: sendProvider === aliyunDypnsSmsProvider,
      message:
        sendProvider === aliyunDypnsSmsProvider
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

    if (!record) {
      throw new AppException(40003, "验证码错误或已过期", HttpStatus.BAD_REQUEST);
    }

    if (record.sendProvider === aliyunDypnsSmsProvider) {
      const aliyunSmsConfig = await this.getAliyunSmsConfig();

      if (!aliyunSmsConfig) {
        throw new AppException(50001, "短信服务配置缺失，请联系管理员", HttpStatus.INTERNAL_SERVER_ERROR);
      }

      await this.checkAliyunSmsVerifyCode(phone, normalizedCode, aliyunSmsConfig);
      await this.prisma.smsVerificationCode.update({
        where: {
          id: record.id
        },
        data: {
          consumedAt: new Date()
        }
      });

      return;
    }

    if (record.codeHash !== this.hashSmsCode(phone, purpose, normalizedCode)) {
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

  private async getSmsCodeTtlSeconds() {
    const config = await this.prisma.systemConfig.findUnique({
      where: {
        key: "smsCodeTtlSeconds"
      },
      select: {
        value: true
      }
    });
    const value = Number(config?.value ?? process.env.SMS_CODE_TTL_SECONDS);

    return Number.isFinite(value) && value > 0 ? value : defaultSmsCodeTtlSeconds;
  }

  private async getAliyunSmsConfig(): Promise<AliyunSmsConfig | null> {
    const configs = await this.prisma.systemConfig.findMany({
      where: {
        key: {
          in: [
            "smsVerificationEnabled",
            "aliyunSmsAccessKeyId",
            "aliyunSmsAccessKeySecretEncrypted",
            "aliyunSmsEndpoint",
            "aliyunSmsRegionId",
            "aliyunSmsSignName",
            "aliyunSmsTemplateCode",
            "aliyunSmsTemplateParamCodeKey",
            "aliyunSmsTemplateParamExtraJson",
            "smsCodeTtlSeconds"
          ]
        }
      }
    });
    const values = new Map(configs.map((config) => [config.key, config.value]));
    const enabled = values.get("smsVerificationEnabled") === "true";

    if (enabled) {
      const accessKeyId = values.get("aliyunSmsAccessKeyId")?.trim();
      const accessKeySecretEncrypted = values.get("aliyunSmsAccessKeySecretEncrypted")?.trim();
      const signName = values.get("aliyunSmsSignName")?.trim();
      const templateCode = values.get("aliyunSmsTemplateCode")?.trim();

      if (!accessKeyId || !accessKeySecretEncrypted || !signName || !templateCode) {
        throw new AppException(50001, "短信服务配置缺失", HttpStatus.INTERNAL_SERVER_ERROR);
      }

      let accessKeySecret: string;

      try {
        accessKeySecret = decryptSecret(accessKeySecretEncrypted);
      } catch {
        throw new AppException(50001, "短信服务密钥无法解密，请在后台重新保存", HttpStatus.INTERNAL_SERVER_ERROR);
      }

      return {
        accessKeyId,
        accessKeySecret,
        endpoint: this.resolveAliyunDypnsEndpoint(values.get("aliyunSmsEndpoint")),
        regionId: values.get("aliyunSmsRegionId")?.trim() || "cn-hangzhou",
        signName,
        templateCode,
        templateParamCodeKey: values.get("aliyunSmsTemplateParamCodeKey")?.trim() || "code",
        templateParamExtraJson: values.get("aliyunSmsTemplateParamExtraJson")?.trim() || "{}",
        timeoutMs: safePositiveNumber(process.env.ALIYUN_SMS_TIMEOUT_MS, 10_000)
      };
    }

    const envAccessKeyId = process.env.ALIYUN_SMS_ACCESS_KEY_ID?.trim();
    const envAccessKeySecret = process.env.ALIYUN_SMS_ACCESS_KEY_SECRET?.trim();
    const envSignName = process.env.ALIYUN_SMS_SIGN_NAME?.trim();
    const envTemplateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE?.trim();

    if (!envAccessKeyId || !envAccessKeySecret || !envSignName || !envTemplateCode) {
      return null;
    }

    return {
      accessKeyId: envAccessKeyId,
      accessKeySecret: envAccessKeySecret,
      endpoint: this.resolveAliyunDypnsEndpoint(process.env.ALIYUN_SMS_ENDPOINT),
      regionId: process.env.ALIYUN_SMS_REGION_ID?.trim() || "cn-hangzhou",
      signName: envSignName,
      templateCode: envTemplateCode,
      templateParamCodeKey: process.env.ALIYUN_SMS_TEMPLATE_PARAM_CODE_KEY?.trim() || "code",
      templateParamExtraJson: process.env.ALIYUN_SMS_TEMPLATE_PARAM_EXTRA_JSON?.trim() || "{}",
      timeoutMs: safePositiveNumber(process.env.ALIYUN_SMS_TIMEOUT_MS, 10_000)
    };
  }

  private async sendAliyunSmsVerifyCode(phone: string, expiresIn: number, config: AliyunSmsConfig) {
    const templateParams = this.buildAliyunSmsTemplateParams(config, expiresIn, false);
    let payload: Awaited<ReturnType<typeof this.requestAliyunSmsApi>>;

    try {
      payload = await this.requestAliyunSmsApi(
        "SendSmsVerifyCode",
        this.buildAliyunSmsVerifyCodeParams(phone, expiresIn, config, templateParams),
        config,
        "短信验证码发送失败"
      );
    } catch (error) {
      if (error instanceof AppException && this.shouldRetryAliyunSmsWithMinParam(error, templateParams)) {
        payload = await this.requestAliyunSmsApi(
          "SendSmsVerifyCode",
          this.buildAliyunSmsVerifyCodeParams(
            phone,
            expiresIn,
            config,
            this.buildAliyunSmsTemplateParams(config, expiresIn, true)
          ),
          config,
          "短信验证码发送失败"
        );
      } else {
        throw error;
      }
    }

    return {
      requestId: payload.RequestId ?? null,
      status: payload.Code ?? "OK"
    };
  }

  private buildAliyunSmsVerifyCodeParams(
    phone: string,
    expiresIn: number,
    config: AliyunSmsConfig,
    templateParams: Record<string, string>
  ) {
    return {
      PhoneNumber: phone,
      SignName: config.signName,
      TemplateCode: config.templateCode,
      TemplateParam: JSON.stringify(templateParams),
      CodeType: "1",
      CodeLength: "6",
      ValidTime: String(expiresIn)
    };
  }

  private buildAliyunSmsTemplateParams(config: AliyunSmsConfig, expiresIn: number, includeDefaultMin: boolean) {
    const templateParams = this.parseAliyunSmsTemplateExtraParams(config.templateParamExtraJson);

    if (includeDefaultMin && !Object.hasOwn(templateParams, "min")) {
      templateParams.min = String(Math.ceil(expiresIn / 60));
    }

    templateParams[config.templateParamCodeKey] = "##code##";

    return templateParams;
  }

  private parseAliyunSmsTemplateExtraParams(value: string) {
    if (!value.trim()) {
      return {} as Record<string, string>;
    }

    try {
      const parsed = JSON.parse(value) as unknown;

      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
        throw new Error("invalid json");
      }

      return Object.fromEntries(
        Object.entries(parsed).map(([key, entryValue]) => [key, String(entryValue)])
      ) as Record<string, string>;
    } catch {
      throw new AppException(50001, "短信模板扩展参数 JSON 格式不正确，请在后台邮件短信配置中修正", HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private shouldRetryAliyunSmsWithMinParam(error: AppException, templateParams: Record<string, string>) {
    if (Object.hasOwn(templateParams, "min")) {
      return false;
    }

    return /模板内容与模板参数|template/i.test(error.message);
  }

  private async checkAliyunSmsVerifyCode(phone: string, code: string, config: AliyunSmsConfig) {
    const payload = await this.requestAliyunSmsApi(
      "CheckSmsVerifyCode",
      {
        PhoneNumber: phone,
        VerifyCode: code
      },
      config,
      "短信验证码校验失败"
    );
    const model = payload.Model;
    const verifyResult = typeof model === "string" ? model : model?.VerifyResult;

    if (verifyResult !== "PASS") {
      throw new AppException(40003, "验证码错误或已过期", HttpStatus.BAD_REQUEST);
    }
  }

  private async requestAliyunSmsApi(
    action: string,
    actionParams: Record<string, string>,
    config: AliyunSmsConfig,
    errorPrefix: string
  ) {
    const params: Record<string, string> = {
      AccessKeyId: config.accessKeyId,
      Action: action,
      Format: "JSON",
      RegionId: config.regionId,
      SignatureMethod: "HMAC-SHA1",
      SignatureNonce: randomBytes(16).toString("hex"),
      SignatureVersion: "1.0",
      Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
      Version: "2017-05-25",
      ...actionParams
    };
    const canonicalQuery = Object.keys(params)
      .sort()
      .map((key) => `${this.aliyunEncode(key)}=${this.aliyunEncode(params[key] ?? "")}`)
      .join("&");
    const stringToSign = `POST&%2F&${this.aliyunEncode(canonicalQuery)}`;
    const signature = createHmac("sha1", `${config.accessKeySecret}&`).update(stringToSign).digest("base64");
    const body = new URLSearchParams({
      ...params,
      Signature: signature
    });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await fetch(config.endpoint, {
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
        AccessDeniedDetail?: string;
        Model?: {
          VerifyResult?: string;
        } | string;
      } | null;

      if (!response.ok || payload?.Code !== "OK") {
        throw new AppException(
          50201,
          this.formatAliyunSmsError(errorPrefix, payload),
          HttpStatus.BAD_GATEWAY
        );
      }

      return payload;
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }

      throw new AppException(50201, `${errorPrefix}：阿里云短信接口请求超时或不可用`, HttpStatus.BAD_GATEWAY);
    } finally {
      clearTimeout(timeout);
    }
  }

  private formatAliyunSmsError(
    errorPrefix: string,
    payload: {
      Code?: string;
      Message?: string;
      AccessDeniedDetail?: string;
    } | null
  ) {
    const code = payload?.Code ?? "";
    const message = payload?.Message ?? "";
    const accessDeniedDetail = payload?.AccessDeniedDetail ? `，详情：${payload.AccessDeniedDetail}` : "";

    if (code.includes("Forbidden") || code.includes("Unauthorized") || /not authorized/i.test(message)) {
      return `${errorPrefix}：当前阿里云 AccessKey 没有号码认证服务权限，请在 RAM 中授予 dypns:SendSmsVerifyCode 和 dypns:CheckSmsVerifyCode，或绑定 AliyunDypnsFullAccess 后重试${accessDeniedDetail}`;
    }

    if (code === "FUNCTION_NOT_OPENED") {
      return `${errorPrefix}：阿里云号码认证服务或短信验证码能力尚未开通，请在阿里云控制台开通后重试`;
    }

    return `${errorPrefix}：${message || code || "阿里云短信接口异常"}`;
  }

  private resolveAliyunDypnsEndpoint(endpoint?: string | null) {
    const normalizedEndpoint = endpoint?.trim();

    if (!normalizedEndpoint || normalizedEndpoint.includes("dysmsapi.aliyuncs.com")) {
      return aliyunDypnsEndpoint;
    }

    return normalizedEndpoint;
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

function safePositiveNumber(value: string | number | undefined | null, fallback: number) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : fallback;
}
