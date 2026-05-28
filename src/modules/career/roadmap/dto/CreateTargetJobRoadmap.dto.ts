import { IsEnum, IsString, IsOptional, IsArray} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoadmapMode } from '../roadmap.enums';
import { RoadmapPreferencesDto } from './RoadmapPreferences.dto';


export class CreateTargetJobRoadmapDto extends RoadmapPreferencesDto {
  @ApiProperty({ enum: RoadmapMode, example: RoadmapMode.TARGET_JOB })
  @IsEnum(RoadmapMode)
  mode: RoadmapMode.TARGET_JOB;

  @ApiProperty({ example: 'Senior Backend Engineer' })
  @IsString()
  targetJob: string;

  @ApiPropertyOptional({ example: 'Backend Mastery Path' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: ['System Design', 'Databases'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  focusAreas?: string[];

  @ApiPropertyOptional({ example: ['Node.js', 'PostgreSQL'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  currentSkillsOverride?: string[];
}








