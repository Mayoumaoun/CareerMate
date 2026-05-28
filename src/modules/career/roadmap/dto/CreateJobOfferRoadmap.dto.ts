import { IsEnum, IsString, IsOptional, IsNumber, IsArray, Min, Max, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoadmapDepth, RoadmapIntensity, RoadmapMode, RoadmapStatus, StepStatus } from '../roadmap.enums';
import { RoadmapPreferencesDto } from './RoadmapPreferences.dto';


export class CreateJobOfferRoadmapDto extends RoadmapPreferencesDto {
  @ApiProperty({ enum: RoadmapMode, example: RoadmapMode.JOB_OFFER })
  @IsEnum(RoadmapMode)
  mode: RoadmapMode.JOB_OFFER;

  @ApiPropertyOptional({ example: 'Prepare for Stripe Offer' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'UUID of a saved job offer. Required if jobDescriptionRaw is absent.', example: 'a1b2c3d4-...' })
  @ValidateIf((o) => !o.jobDescriptionRaw)
  @IsString()
  jobOfferId?: string;

  @ApiPropertyOptional({ description: 'Raw job description text. Required if jobOfferId is absent.' })
  @ValidateIf((o) => !o.jobOfferId)
  @IsString()
  jobDescriptionRaw?: string;
}

