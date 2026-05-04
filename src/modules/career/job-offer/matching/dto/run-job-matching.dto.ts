import { IsArray, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { JobSource } from '../job-matching.types';

export class RunJobMatchingDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  shortlistSize?: number;

  @IsOptional()
  @IsArray()
  @IsEnum(['adzuna', 'themuse'], { each: true })
  sources?: JobSource[];
}