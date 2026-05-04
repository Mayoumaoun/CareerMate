import { IsArray, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { JobSource } from '../job-matching.types';

export class SyncJobSourcesDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  limitPerSource?: number;

  @IsOptional()
  @IsArray()
  @IsEnum(['adzuna', 'themuse'], { each: true })
  sources?: JobSource[];
}