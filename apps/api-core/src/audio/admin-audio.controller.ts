import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, Req, StreamableFile } from "@nestjs/common";
import { AdminAuthService } from "../admin-auth/admin-auth.service.js";
import { successResponse } from "../common/api-response.js";
import { writeAdminOperationLog } from "../security/admin-operation-log.js";
import type { HeaderRequestLike } from "../security/request-types.js";
import { AudioService, localAudioStream } from "./audio.service.js";
import {
  CreateAudioPricingRuleDto,
  DeleteVoiceAssetAdminDto,
  ReviewVoiceAssetDto,
  UpdateAudioModelDto,
  UpdateAudioPricingRuleDto,
  UpdateSystemVoiceDto
} from "./dto/audio.dto.js";

@Controller("admin/audio")
export class AdminAudioController {
  constructor(
    @Inject(AudioService) private readonly audioService: AudioService,
    @Inject(AdminAuthService) private readonly adminAuthService: AdminAuthService
  ) {}

  @Get("models")
  async listModels(@Req() request: unknown) {
    await this.adminAuthService.me(request as never);

    return successResponse(await this.audioService.listAdminAudioModels());
  }

  @Patch("models/:id")
  async updateModel(
    @Req() request: unknown,
    @Param("id") id: string,
    @Body() dto: UpdateAudioModelDto
  ) {
    const admin = await this.adminAuthService.me(request as never);
    const model = await this.audioService.updateAdminAudioModel(id, dto);

    await writeAdminOperationLog({
      adminUserId: admin.id,
      action: "AUDIO_MODEL_UPDATE",
      resourceType: "AI_MODEL_INSTANCE",
      resourceId: id,
      description: `更新语音模型配置：${model.modelName}`,
      request: request as HeaderRequestLike
    });

    return successResponse(model);
  }

  @Get("tasks")
  async listTasks(
    @Req() request: unknown,
    @Query("user") user?: string,
    @Query("status") status?: string,
    @Query("type") type?: string
  ) {
    await this.adminAuthService.me(request as never);

    return successResponse(await this.audioService.listAdminTasks({ user, status, type }));
  }

  @Get("tasks/:id")
  async getTask(@Req() request: unknown, @Param("id") id: string) {
    await this.adminAuthService.me(request as never);

    return successResponse(await this.audioService.getAdminTask(id));
  }

  @Get("safety-settings")
  async safetySettings(@Req() request: unknown) {
    await this.adminAuthService.me(request as never);

    return successResponse(await this.audioService.getSafetySettings());
  }

  @Get("voices")
  async listVoices(@Req() request: unknown) {
    await this.adminAuthService.me(request as never);

    return successResponse(await this.audioService.listAdminVoiceAssets());
  }

  @Get("system-voices")
  async listSystemVoices(
    @Req() request: unknown,
    @Query("keyword") keyword?: string,
    @Query("status") status?: string,
    @Query("language") language?: string,
    @Query("model") model?: string
  ) {
    await this.adminAuthService.me(request as never);

    return successResponse(await this.audioService.listAdminSystemVoiceAssets({ keyword, status, language, model }));
  }

  @Get("system-voices/:voice")
  async getSystemVoice(@Req() request: unknown, @Param("voice") voice: string) {
    await this.adminAuthService.me(request as never);

    return successResponse(await this.audioService.getAdminSystemVoiceAsset(voice));
  }

  @Patch("system-voices/:voice")
  async updateSystemVoice(
    @Req() request: unknown,
    @Param("voice") voice: string,
    @Body() dto: UpdateSystemVoiceDto
  ) {
    const admin = await this.adminAuthService.me(request as never);
    const result = await this.audioService.updateAdminSystemVoice(voice, dto);

    await writeAdminOperationLog({
      adminUserId: admin.id,
      action: "AUDIO_SYSTEM_VOICE_UPDATE",
      resourceType: "SYSTEM_VOICE",
      resourceId: voice,
      description: `更新系统音色：${result.name}`,
      request: request as HeaderRequestLike
    });

    return successResponse(result);
  }

  @Get("voices/:id")
  async getVoice(@Req() request: unknown, @Param("id") id: string) {
    await this.adminAuthService.me(request as never);

    return successResponse(await this.audioService.getAdminVoiceAsset(id));
  }

  @Get("assets/:id/file")
  async getSourceSampleFile(@Req() request: unknown, @Param("id") id: string) {
    await this.adminAuthService.me(request as never);
    const file = await this.audioService.getAdminAudioAssetFile(id);

    return new StreamableFile(localAudioStream(file.filepath), {
      type: file.mimeType,
      disposition: `inline; filename="${file.filename}"`,
      length: file.size
    });
  }

  @Patch("voices/:id/review")
  async reviewVoice(
    @Req() request: unknown,
    @Param("id") id: string,
    @Body() dto: ReviewVoiceAssetDto
  ) {
    const admin = await this.adminAuthService.me(request as never);
    const voice = await this.audioService.reviewVoiceAsset(id, dto, admin.id);

    await writeAdminOperationLog({
      adminUserId: admin.id,
      action: `AUDIO_VOICE_${dto.action}`,
      resourceType: "VOICE_ASSET",
      resourceId: id,
      description: `语音音色审核操作：${dto.action}`,
      request: request as HeaderRequestLike
    });

    return successResponse(voice);
  }

  @Delete("voices/:id")
  async deleteVoice(
    @Req() request: unknown,
    @Param("id") id: string,
    @Body() dto: DeleteVoiceAssetAdminDto
  ) {
    const admin = await this.adminAuthService.me(request as never);
    const result = await this.audioService.deleteVoiceAssetAsAdmin(id, dto, admin.id);

    await writeAdminOperationLog({
      adminUserId: admin.id,
      action: "AUDIO_VOICE_DELETE",
      resourceType: "VOICE_ASSET",
      resourceId: id,
      description: "删除违规语音音色",
      request: request as HeaderRequestLike
    });

    return successResponse(result);
  }

  @Get("pricing-rules")
  async listPricingRules(@Req() request: unknown) {
    await this.adminAuthService.me(request as never);

    return successResponse(await this.audioService.listPricingRules());
  }

  @Post("pricing-rules")
  async createPricingRule(@Req() request: unknown, @Body() dto: CreateAudioPricingRuleDto) {
    const admin = await this.adminAuthService.me(request as never);
    const rule = await this.audioService.createPricingRule(dto);

    await writeAdminOperationLog({
      adminUserId: admin.id,
      action: "AUDIO_PRICING_RULE_CREATE",
      resourceType: "AUDIO_PRICING_RULE",
      resourceId: rule.id,
      description: `创建或覆盖语音计费规则：${rule.operationTypeName} / ${rule.model}`,
      request: request as HeaderRequestLike
    });

    return successResponse(rule);
  }

  @Patch("pricing-rules/:id")
  async updatePricingRule(
    @Req() request: unknown,
    @Param("id") id: string,
    @Body() dto: UpdateAudioPricingRuleDto
  ) {
    const admin = await this.adminAuthService.me(request as never);
    const rule = await this.audioService.updatePricingRule(id, dto);

    await writeAdminOperationLog({
      adminUserId: admin.id,
      action: "AUDIO_PRICING_RULE_UPDATE",
      resourceType: "AUDIO_PRICING_RULE",
      resourceId: id,
      description: `更新语音计费规则：${rule.operationTypeName} / ${rule.model}`,
      request: request as HeaderRequestLike
    });

    return successResponse(rule);
  }

  @Get("usage")
  async usage(
    @Req() request: unknown,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("operationType") operationType?: string,
    @Query("model") model?: string
  ) {
    await this.adminAuthService.me(request as never);

    return successResponse(await this.audioService.getUsageDashboard({ from, to, operationType, model }));
  }
}
