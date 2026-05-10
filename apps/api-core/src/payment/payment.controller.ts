import { Body, Controller, Get, Inject, Param, Post, Req } from "@nestjs/common";
import { AuthService } from "../auth/auth.service.js";
import { successResponse } from "../common/api-response.js";
import type { HeaderRequestLike } from "../security/request-types.js";
import { CreatePaymentOrderDto } from "./dto/create-payment-order.dto.js";
import { PaymentService, type PaymentProvider } from "./payment.service.js";

@Controller("payment")
export class PaymentController {
  constructor(
    @Inject(PaymentService) private readonly paymentService: PaymentService,
    @Inject(AuthService) private readonly authService: AuthService
  ) {}

  @Post("orders")
  async createOrder(@Req() request: unknown, @Body() dto: CreatePaymentOrderDto) {
    const user = await this.authService.me(request as never);

    return successResponse(await this.paymentService.createOrder(user.id, dto));
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
}
