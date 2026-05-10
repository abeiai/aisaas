import { IsObject, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateAiTaskDto {
  @IsString()
  @MinLength(1)
  scenarioId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  input!: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  knowledgeBaseId?: string;
}
