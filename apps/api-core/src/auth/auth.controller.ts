import { Body, Controller, Get, Inject, Patch, Post, Req, Res } from "@nestjs/common";
import { successResponse } from "../common/api-response.js";
import { AuthService } from "./auth.service.js";
import { ChangePasswordDto } from "./dto/change-password.dto.js";
import { LoginDto } from "./dto/login.dto.js";
import { RegisterDto } from "./dto/register.dto.js";
import { UpdateProfileDto } from "./dto/update-profile.dto.js";

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post("register")
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) response: unknown) {
    return successResponse(await this.authService.register(dto, response as never));
  }

  @Post("login")
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: unknown) {
    return successResponse(await this.authService.login(dto, response as never));
  }

  @Post("logout")
  async logout(@Req() request: unknown, @Res({ passthrough: true }) response: unknown) {
    return successResponse(await this.authService.logout(request as never, response as never));
  }

  @Get("me")
  async me(@Req() request: unknown) {
    return successResponse(await this.authService.me(request as never));
  }

  @Patch("profile")
  async updateProfile(@Req() request: unknown, @Body() dto: UpdateProfileDto) {
    const user = await this.authService.me(request as never);

    return successResponse(await this.authService.updateProfile(user.id, dto));
  }

  @Patch("password")
  async changePassword(@Req() request: unknown, @Body() dto: ChangePasswordDto) {
    const user = await this.authService.me(request as never);

    return successResponse(await this.authService.changePassword(user.id, dto));
  }
}
