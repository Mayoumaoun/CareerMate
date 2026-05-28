import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { StepStatus } from "../roadmap.enums";

export class UpdateStepDto {
  @ApiProperty({ enum: StepStatus })
  @IsEnum(StepStatus)
  status: StepStatus;

  @ApiPropertyOptional({ example: 'Completed the Udemy course section' })
  @IsOptional()
  @IsString()
  notes?: string;
}
