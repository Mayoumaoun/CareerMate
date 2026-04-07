import { IsString, IsNotEmpty, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ExperienceDto {
  @ApiProperty({
    description: 'Job title or position',
    example: 'Senior Full Stack Developer',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Company name',
    example: 'Tech Innovations Inc',
  })
  @IsString()
  @IsNotEmpty()
  company: string;

  @ApiProperty({
    description: 'Work location',
    example: 'Tunis, Tunisia',
  })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({
    description: 'Start date in ISO 8601 format',
    example: '2026-06-15',
  })
  @IsString()
  @IsNotEmpty()
  startDate: string; // ISO 8601 format

  @ApiProperty({
    description: 'End date in ISO 8601 format',
    example: '2026-08-31',
  })
  @IsString()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({
    description: 'Job description and achievements',
    example: 'Led development of microservices architecture',
  })
  @IsString()
  @IsNotEmpty()
  description: string;
}

export class Step4ExperiencesDto {
  @ApiProperty({
    description: 'Array of work experiences',
    type: [ExperienceDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperienceDto)
  experiences: ExperienceDto[];
}
