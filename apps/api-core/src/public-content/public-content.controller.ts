import { Controller, Get, Inject, Param } from "@nestjs/common";
import { successResponse } from "../common/api-response.js";
import { PublicContentService } from "./public-content.service.js";

@Controller("public")
export class PublicContentController {
  constructor(@Inject(PublicContentService) private readonly publicContentService: PublicContentService) {}

  @Get("articles")
  async listArticles() {
    return successResponse(await this.publicContentService.listArticles());
  }

  @Get("articles/:slug")
  async getArticle(@Param("slug") slug: string) {
    return successResponse(await this.publicContentService.getArticle(slug));
  }

  @Get("pages")
  async listPages() {
    return successResponse(await this.publicContentService.listPages());
  }

  @Get("pages/:slug")
  async getPage(@Param("slug") slug: string) {
    return successResponse(await this.publicContentService.getPage(slug));
  }
}
