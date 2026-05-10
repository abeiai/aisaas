import { Body, Controller, Get, Inject, Param, Post, Query, Req, Res } from "@nestjs/common";
import { AuthService } from "../auth/auth.service.js";
import { successResponse } from "../common/api-response.js";
import { AiService } from "./ai.service.js";
import { CreateAiTaskDto } from "./dto/create-ai-task.dto.js";

@Controller("ai")
export class AiController {
  constructor(
    @Inject(AiService) private readonly aiService: AiService,
    @Inject(AuthService) private readonly authService: AuthService
  ) {}

  @Get("scenarios")
  async scenarios() {
    return successResponse(await this.aiService.listScenarios());
  }

  @Get("tool-categories")
  async toolCategories() {
    return successResponse(await this.aiService.listToolCategories(false));
  }

  @Get("tools")
  async tools(@Query("category") category?: string) {
    return successResponse(await this.aiService.listTools(category));
  }

  @Get("tools/:slug")
  async tool(@Param("slug") slug: string) {
    return successResponse(await this.aiService.getTool(slug));
  }

  @Post("tasks")
  async createTask(@Req() request: unknown, @Body() dto: CreateAiTaskDto) {
    const user = await this.authService.me(request as never);

    return successResponse(await this.aiService.createTask(user.id, dto));
  }

  @Post("tasks/stream")
  async createTaskStream(
    @Req() request: unknown,
    @Res() response: unknown,
    @Body() dto: CreateAiTaskDto
  ) {
    const user = await this.authService.me(request as never);
    const res = response as {
      setHeader(name: string, value: string): void;
      write(chunk: string): void;
      end(): void;
    };
    const req = request as {
      on(event: "close", listener: () => void): void;
    };
    const controller = new AbortController();
    let finished = false;

    req.on("close", () => {
      if (!finished) {
        controller.abort();
      }
    });
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");

    try {
      await this.aiService.createTaskStream(
        user.id,
        dto,
        (event) => {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        },
        controller.signal
      );
    } finally {
      finished = true;
      res.end();
    }
  }

  @Get("tasks")
  async tasks(@Req() request: unknown) {
    const user = await this.authService.me(request as never);

    return successResponse(await this.aiService.listUserTasks(user.id));
  }

  @Get("tasks/:id")
  async task(@Req() request: unknown, @Param("id") id: string) {
    const user = await this.authService.me(request as never);

    return successResponse(await this.aiService.getTask(user.id, id));
  }
}
