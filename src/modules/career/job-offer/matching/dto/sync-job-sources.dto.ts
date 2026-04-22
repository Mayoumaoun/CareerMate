import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { JobSource } from '../job-matching.types';

export class SyncJobSourcesDto {
  @IsOptional()
  @IsString()
  userId?: string;

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
  @IsString({ each: true })
  sources?: JobSource[];
}