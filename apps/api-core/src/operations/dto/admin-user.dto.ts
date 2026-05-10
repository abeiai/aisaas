import { IsIn, IsInt, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

export class UpdateUserStatusDto {
  @IsIn(["ACTIVE", "DISABLED"])
  status!: "ACTIVE" | "DISABLED";
}

export class AdjustUserCreditsDto {
  @IsInt()
  @Min(-1_000_000)
  @Max(1_000_000)
  amount!: number;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  reason!: string;
}
