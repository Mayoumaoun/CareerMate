import { IsString, IsNotEmpty, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class ExperienceDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  company: string;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsString()
  @IsNotEmpty()
  startDate: string; // ISO 8601 format

  @IsString()
  @IsNotEmpty()
  endDate: string;

  @IsString()
  @IsNotEmpty()
  description: string;
}

export class Step4ExperiencesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperienceDto)
  experiences: ExperienceDto[];
}
