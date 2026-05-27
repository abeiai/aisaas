import { Body, Controller, Inject, Post, Req } from "@nestjs/common";
import { AuthService } from "../auth/auth.service.js";
import { successResponse } from "../common/api-response.js";
import { AdvancedAiService } from "./advanced-ai.service.js";
import { AgentToolRunDto } from "./dto/advanced-ai.dto.js";

@Controller("ai")
export class AdvancedAiController {
  constructor(
    @Inject(AdvancedAiService) private readonly advancedAiService: AdvancedAiService,
    @Inject(AuthService) private readonly authService: AuthService
  ) {}

  @Post("agent-tools/run")
  async runTool(@Req() request: unknown, @Body() dto: AgentToolRunDto) {
    const user = await this.authService.me(request as never);

    return successResponse(await this.advancedAiService.runAgentTool(user.id, dto));
  }
}
