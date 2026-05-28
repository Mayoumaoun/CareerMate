import { IsEnum, IsString, IsOptional, IsNumber, IsArray, Min, Max, ValidateIf } from 'class-validator';
import {  ApiPropertyOptional } from '@nestjs/swagger';
import { RoadmapStatus } from '../roadmap.enums';

export class GetRoadmapsByStatusDto {
  @ApiPropertyOptional({ enum: RoadmapStatus, default: RoadmapStatus.ACTIVE })
  @IsOptional()
  @IsEnum(RoadmapStatus)
  status?: RoadmapStatus;
}