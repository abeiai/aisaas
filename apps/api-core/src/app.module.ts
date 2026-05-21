import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AdminAuthModule } from "./admin-auth/admin-auth.module.js";
import { AiModule } from "./ai/ai.module.js";
import { AudioModule } from "./audio/audio.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { CmsModule } from "./cms/cms.module.js";
import { ContentModulesModule } from "./content-modules/content-modules.module.js";
import { HealthModule } from "./health/health.module.js";
import { MediaModule } from "./media/media.module.js";
import { OperationsModule } from "./operations/operations.module.js";
import { OnboardingModule } from "./onboarding/onboarding.module.js";
import { PageCompositionsModule } from "./page-compositions/page-compositions.module.js";
import { PaymentModule } from "./payment/payment.module.js";
import { PublicContentModule } from "./public-content/public-content.module.js";
import { RateLimitInterceptor } from "./security/rate-limit.interceptor.js";
import { RequestLoggingInterceptor } from "./security/request-logging.interceptor.js";
import { SystemConfigModule } from "./system-config/system-config.module.js";
import { WalletModule } from "./wallet/wallet.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    AuthModule,
    AdminAuthModule,
    AudioModule,
    AiModule,
    CmsModule,
    ContentModulesModule,
    PublicContentModule,
    MediaModule,
    WalletModule,
    PaymentModule,
    PageCompositionsModule,
    OperationsModule,
    OnboardingModule,
    SystemConfigModule,
    HealthModule
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RateLimitInterceptor
    }
  ]
})
export class AppModule {}
