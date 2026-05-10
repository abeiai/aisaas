import { Module } from "@nestjs/common";
import { PublicContentController } from "./public-content.controller.js";
import { PublicContentService } from "./public-content.service.js";

@Module({
  controllers: [PublicContentController],
  providers: [PublicContentService]
})
export class PublicContentModule {}
