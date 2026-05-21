import { Module } from "@nestjs/common";
import { AdminAuthModule } from "../admin-auth/admin-auth.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { AdminAudioController } from "./admin-audio.controller.js";
import { AudioController } from "./audio.controller.js";
import { AudioService } from "./audio.service.js";

@Module({
  imports: [AuthModule, AdminAuthModule],
  controllers: [AudioController, AdminAudioController],
  providers: [AudioService],
  exports: [AudioService]
})
export class AudioModule {}
