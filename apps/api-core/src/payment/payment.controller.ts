import { Body, Controller, Get, Inject, Param, Post, Query, Req, Res } from "@nestjs/common";
import { AuthService } from "../auth/auth.service.js";
import { AppException } from "../common/app-exception.js";
import { successResponse } from "../common/api-response.js";
import type { HeaderRequestLike } from "../security/request-types.js";
import { CreatePaymentOrderDto } from "./dto/create-payment-order.dto.js";
import { PaymentService, type PaymentProvider } from "./payment.service.js";
import { WechatOAuthService } from "./wechat-oauth.service.js";

@Controller("payment")
export class PaymentController {
  constructor(
    @Inject(PaymentService) private readonly paymentService: PaymentService,
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(WechatOAuthService) private readonly wechatOAuthService: WechatOAuthService
  ) {}

  @Post("orders")
  async createOrder(@Req() request: HeaderRequestLike, @Body() dto: CreatePaymentOrderDto) {
    const user = await this.authService.me(request as never);

    return successResponse(await this.paymentService.createOrder(user.id, dto, request));
  }

  @Get("products")
  async listProducts(@Req() request: unknown) {
    const user = await this.authService.me(request as never);

    return successResponse(await this.paymentService.listAvailableProducts(user.id));
  }

  @Get("orders/:id")
  async getOrder(@Req() request: unknown, @Param("id") id: string) {
    const user = await this.authService.me(request as never);

    return successResponse(await this.paymentService.getOrder(user.id, id));
  }

  @Post("alipay/notify")
  async alipayNotify(@Body() body: Record<string, unknown>, @Req() request: HeaderRequestLike) {
    return successResponse(await this.paymentService.handleAlipayNotify(body, request.headers));
  }

  @Post("wechat/notify")
  async wechatNotify(@Body() body: Record<string, unknown>, @Req() request: HeaderRequestLike) {
    return successResponse(await this.paymentService.handleWechatNotify(body, request));
  }

  @Post("mock/:provider/notify")
  async mockNotify(@Param("provider") provider: PaymentProvider, @Body() body: Record<string, unknown>) {
    return successResponse(await this.paymentService.handleMockNotify(provider, body));
  }

  @Get("wechat/jsapi/authorize")
  async authorizeWechatJsapi(
    @Req() request: unknown,
    @Query("redirect") redirectPath: string | undefined,
    @Res() response: {
      redirect(statusCode: number, url: string): void;
    }
  ) {
    const user = await this.authService.me(request as never);
    const url = await this.wechatOAuthService.createAuthorizationUrl(user.id, redirectPath ?? "/dashboard/billing");

    response.redirect(302, url);
  }

  @Get("wechat/jsapi/callback")
  async handleWechatJsapiCallback(
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Res() response: {
      redirect(statusCode: number, url: string): void;
    }
  ) {
    if (!code || !state) {
      throw new AppException(40001, "微信授权参数不完整", 400);
    }

    const redirectPath = await this.wechatOAuthService.handleCallback(code, state);

    response.redirect(302, redirectPath);
  }
}
