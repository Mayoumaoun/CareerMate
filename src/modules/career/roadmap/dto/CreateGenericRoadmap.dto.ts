import { IsEnum, IsString, IsOptional} from 'class-validator';
import {  ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoadmapMode } from '../roadmap.enums';
import { RoadmapPreferencesDto } from './RoadmapPreferences.dto';

export class CreateGenericRoadmapDto extends RoadmapPreferencesDto {
  @ApiProperty({ enum: RoadmapMode, example: RoadmapMode.GENERIC })
  @IsEnum(RoadmapMode)
  mode: RoadmapMode.GENERIC;

  @ApiProperty({ example: 'Machine Learning' })
  @IsString()
  topic: string;

  @ApiPropertyOptional({ example: 'ML from Zero to Hero' })
  @IsOptional()
  @IsString()
  title?: string;
}