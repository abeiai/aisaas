import { Controller, Get, Inject, Req } from "@nestjs/common";
import { AuthService } from "../auth/auth.service.js";
import { successResponse } from "../common/api-response.js";
import { WalletService } from "./wallet.service.js";

@Controller("wallet")
export class WalletController {
  constructor(
    @Inject(WalletService) private readonly walletService: WalletService,
    @Inject(AuthService) private readonly authService: AuthService
  ) {}

  @Get("me")
  async me(@Req() request: unknown) {
    const user = await this.authService.me(request as never);

    return successResponse(await this.walletService.getWallet(user.id));
  }

  @Get("ledger")
  async ledger(@Req() request: unknown) {
    const user = await this.authService.me(request as never);

    return successResponse(await this.walletService.listLedger(user.id));
  }
}
