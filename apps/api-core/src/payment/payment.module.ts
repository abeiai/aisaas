import { Module } from "@nestjs/common";
import { AdminAuthModule } from "../admin-auth/admin-auth.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { AdminPaymentController } from "./admin-payment.controller.js";
import { AlipayClient } from "./alipay.client.js";
import { PaymentController } from "./payment.controller.js";
import { PaymentService } from "./payment.service.js";
import { WechatPayClient } from "./wechat-pay.client.js";

@Module({
  imports: [AuthModule, AdminAuthModule],
  controllers: [PaymentController, AdminPaymentController],
  providers: [PaymentService, AlipayClient, WechatPayClient]
})
export class PaymentModule {}
