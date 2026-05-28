import { IsEnum, IsString, IsOptional, IsNumber, IsArray, Min, Max, ValidateIf } from 'class-validator';
import {  ApiPropertyOptional } from '@nestjs/swagger';
import { RoadmapDepth, RoadmapIntensity } from '../roadmap.enums';


export class RoadmapPreferencesDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 52, example: 12 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(52)
  durationWeeks?: number;

  @ApiPropertyOptional({ enum: RoadmapIntensity })
  @IsOptional()
  @IsEnum(RoadmapIntensity)
  intensity?: RoadmapIntensity;

  @ApiPropertyOptional({ enum: RoadmapDepth })
  @IsOptional()
  @IsEnum(RoadmapDepth)
  depth?: RoadmapDepth;
}
