import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor
} from "@nestjs/common";
import type { Observable } from "rxjs";
import { AppException } from "../common/app-exception.js";
import { getClientIp, getRequestPath, type HeaderRequestLike } from "./request-types.js";

interface RateLimitRule {
  method: string;
  path: RegExp;
  maxEnv: string;
  fallbackMax: number;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const rules: RateLimitRule[] = [
  {
    method: "POST",
    path: /^\/api\/auth\/login$/,
    maxEnv: "RATE_LIMIT_AUTH_LOGIN_MAX",
    fallbackMax: 10
  },
  {
    method: "POST",
    path: /^\/api\/auth\/register$/,
    maxEnv: "RATE_LIMIT_AUTH_REGISTER_MAX",
    fallbackMax: 5
  },
  {
    method: "POST",
    path: /^\/api\/auth\/phone-code$/,
    maxEnv: "RATE_LIMIT_AUTH_PHONE_CODE_MAX",
    fallbackMax: 5
  },
  {
    method: "POST",
    path: /^\/api\/auth\/phone-login$/,
    maxEnv: "RATE_LIMIT_AUTH_PHONE_LOGIN_MAX",
    fallbackMax: 10
  },
  {
    method: "POST",
    path: /^\/api\/admin-auth\/login$/,
    maxEnv: "RATE_LIMIT_ADMIN_AUTH_LOGIN_MAX",
    fallbackMax: 10
  },
  {
    method: "POST",
    path: /^\/api\/payment\/orders$/,
    maxEnv: "RATE_LIMIT_PAYMENT_ORDERS_MAX",
    fallbackMax: 20
  },
  {
    method: "POST",
    path: /^\/api\/ai\/tasks$/,
    maxEnv: "RATE_LIMIT_AI_TASKS_MAX",
    fallbackMax: 20
  }
];

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private readonly buckets = new Map<string, RateLimitBucket>();

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<HeaderRequestLike>();
    const method = request.method ?? "";
    const path = getRequestPath(request);
    const rule = rules.find((item) => item.method === method && item.path.test(path));

    if (rule) {
      this.assertAllowed(request, rule, path);
    }

    return next.handle();
  }

  private assertAllowed(request: HeaderRequestLike, rule: RateLimitRule, path: string) {
    const windowMs = this.windowSeconds() * 1000;
    const maxRequests = this.maxRequests(rule);
    const key = `${rule.method}:${path}:${getClientIp(request) ?? "unknown"}`;
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, {
        count: 1,
        resetAt: now + windowMs
      });
      return;
    }

    bucket.count += 1;

    if (bucket.count > maxRequests) {
      throw new AppException(
        42901,
        "请求过于频繁，请稍后再试。",
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
  }

  private windowSeconds() {
    const value = Number(process.env.RATE_LIMIT_WINDOW_SECONDS);

    return Number.isFinite(value) && value > 0 ? value : 60;
  }

  private maxRequests(rule: RateLimitRule) {
    const value = Number(process.env[rule.maxEnv]);

    return Number.isFinite(value) && value > 0 ? value : rule.fallbackMax;
  }
}
