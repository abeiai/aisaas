import { Body, Controller, Get, Inject, Post, Req } from "@nestjs/common";
import { AdminAuthService } from "../admin-auth/admin-auth.service.js";
import { successResponse } from "../common/api-response.js";
import { writeAdminOperationLog } from "../security/admin-operation-log.js";
import type { HeaderRequestLike } from "../security/request-types.js";
import { AdvancedAiService } from "./advanced-ai.service.js";
import { CreateWorkflowDto } from "./dto/advanced-ai.dto.js";

@Controller("admin/ai-workflows")
export class AdminAiWorkflowController {
  constructor(
    @Inject(AdvancedAiService) private readonly advancedAiService: AdvancedAiService,
    @Inject(AdminAuthService) private readonly adminAuthService: AdminAuthService
  ) {}

  @Get()
  async list(@Req() request: unknown) {
    await this.adminAuthService.me(request as never);

    return successResponse(await this.advancedAiService.listWorkflows());
  }

  @Post()
  async create(@Req() request: unknown, @Body() dto: CreateWorkflowDto) {
    const admin = await this.adminAuthService.me(request as never);
    const workflow = await this.advancedAiService.createWorkflow(dto);

    await writeAdminOperationLog({
      adminUserId: admin.id,
      action: "UPSERT_AI_WORKFLOW",
      resourceType: "AI_WORKFLOW",
      resourceId: workflow.id,
      description: `保存 AI 工作流：${workflow.name}`,
      request: request as HeaderRequestLike
    });

    return successResponse(workflow);
  }
}
