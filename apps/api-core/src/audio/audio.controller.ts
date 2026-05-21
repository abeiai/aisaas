import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthService } from "../auth/auth.service.js";
import { successResponse } from "../common/api-response.js";
import type { HeaderRequestLike } from "../security/request-types.js";
import { AudioService, localAudioStream, type UploadedAudioFileLike } from "./audio.service.js";
import {
  CreateAudioAssetDto,
  CreateTtsAudioTaskDto,
  CreateVoiceCloneTaskDto,
  CreateVoiceDesignTaskDto,
  SetDefaultVoiceDto,
  UpdateVoiceAssetDto
} from "./dto/audio.dto.js";

@Controller("audio")
export class AudioController {
  constructor(
    @Inject(AudioService) private readonly audioService: AudioService,
    @Inject(AuthService) private readonly authService: AuthService
  ) {}

  @Get("models")
  async listModels(@Req() request: unknown) {
    await this.authService.me(request as never);

    return successResponse(await this.audioService.listModelOptions());
  }

  @Get("voices")
  async listVoices(@Req() request: unknown) {
    const user = await this.authService.me(request as never);

    return successResponse(await this.audioService.listVoiceAssets(user.id));
  }

  @Patch("voices/default")
  async setDefaultVoice(@Req() request: unknown, @Body() dto: SetDefaultVoiceDto) {
    const user = await this.authService.me(request as never);

    return successResponse(await this.audioService.setDefaultVoice(user.id, dto));
  }

  @Patch("voices/:id")
  async updateVoice(@Req() request: unknown, @Param("id") id: string, @Body() dto: UpdateVoiceAssetDto) {
    const user = await this.authService.me(request as never);

    return successResponse(await this.audioService.updateVoiceAsset(user.id, id, dto));
  }

  @Delete("voices/:id")
  async deleteVoice(@Req() request: unknown, @Param("id") id: string) {
    const user = await this.authService.me(request as never);

    return successResponse(await this.audioService.deleteVoiceAsset(user.id, id));
  }

  @Get("assets")
  async listAssets(@Req() request: unknown) {
    const user = await this.authService.me(request as never);

    return successResponse(await this.audioService.listUserAudioAssets(user.id));
  }

  @Post("assets")
  async createAsset(@Req() request: unknown, @Body() dto: CreateAudioAssetDto) {
    const user = await this.authService.me(request as never);

    return successResponse(await this.audioService.createAudioAsset(user.id, dto));
  }

  @Post("assets/upload")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: Number(process.env.AUDIO_UPLOAD_MAX_BYTES ?? 20 * 1024 * 1024)
      }
    })
  )
  async uploadAsset(
    @Req() request: unknown,
    @Query("type") type: "SOURCE_SAMPLE" | "PREVIEW" | "TTS_OUTPUT" = "SOURCE_SAMPLE",
    @UploadedFile() file?: UploadedAudioFileLike
  ) {
    const user = await this.authService.me(request as never);

    return successResponse(await this.audioService.uploadAudioAsset(user.id, type, file));
  }

  @Delete("assets/:id")
  async deleteAsset(@Req() request: unknown, @Param("id") id: string) {
    const user = await this.authService.me(request as never);

    return successResponse(await this.audioService.deleteAudioAsset(user.id, id));
  }

  @Get("tasks")
  async listTasks(@Req() request: unknown) {
    const user = await this.authService.me(request as never);

    return successResponse(await this.audioService.listUserTasks(user.id));
  }

  @Get("tasks/:id")
  async getTask(@Req() request: unknown, @Param("id") id: string) {
    const user = await this.authService.me(request as never);

    return successResponse(await this.audioService.getUserTask(user.id, id));
  }

  @Post("tasks/tts")
  async createTtsTask(@Req() request: unknown, @Body() dto: CreateTtsAudioTaskDto) {
    const user = await this.authService.me(request as never);

    return successResponse(await this.audioService.createTtsTask(user.id, dto));
  }

  @Post("tasks/voice-clone")
  async createVoiceCloneTask(@Req() request: unknown, @Body() dto: CreateVoiceCloneTaskDto) {
    const user = await this.authService.me(request as never);

    return successResponse(await this.audioService.createVoiceCloneTask(user.id, dto, request as HeaderRequestLike));
  }

  @Post("tasks/voice-design")
  async createVoiceDesignTask(@Req() request: unknown, @Body() dto: CreateVoiceDesignTaskDto) {
    const user = await this.authService.me(request as never);

    return successResponse(await this.audioService.createVoiceDesignTask(user.id, dto));
  }

  @Get("files/:filename")
  async file(@Param("filename") filename: string, @Res() response: unknown) {
    const file = await this.audioService.getLocalAudioFile(filename);
    const res = response as {
      setHeader(name: string, value: string | number): void;
      status(code: number): { end(): void };
    } & NodeJS.WritableStream;

    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Length", file.size);
    res.setHeader("Cache-Control", "private, max-age=3600");

    localAudioStream(file.filepath).pipe(res);
  }
}
