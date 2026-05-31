import { Module } from "@nestjs/common";
import { AdminAuthModule } from "../admin-auth/admin-auth.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { OrganizationsModule } from "../organizations/organizations.module.js";
import { AdminAudioController } from "./admin-audio.controller.js";
import { AudioController } from "./audio.controller.js";
import { AudioService } from "./audio.service.js";

@Module({
  imports: [AuthModule, AdminAuthModule, OrganizationsModule],
  controllers: [AudioController, AdminAudioController],
  providers: [AudioService],
  exports: [AudioService]
})
export class AudioModule {}
