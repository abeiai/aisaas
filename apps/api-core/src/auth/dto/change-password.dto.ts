import { IsString, MaxLength, MinLength } from "class-validator";

export class ChangePasswordDto {
  @IsString({ message: "当前密码不能为空" })
  @MinLength(8, { message: "当前密码至少 8 位" })
  currentPassword!: string;

  @IsString({ message: "新密码不能为空" })
  @MinLength(8, { message: "新密码至少 8 位" })
  @MaxLength(72, { message: "新密码不能超过 72 个字符" })
  newPassword!: string;
}
