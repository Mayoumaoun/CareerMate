import { IsString, IsNotEmpty, IsArray, IsOptional, IsUrl, IsDateString, ValidateNested, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ProjectDto {
  @IsString() @IsNotEmpty()
  title: string;

  @IsString() @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  projectId?: string;

  @IsString() @IsNotEmpty()
  context: string;

  @IsString() @IsNotEmpty()
  description: string;

  @IsUrl() @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  projectUrl?: string;

  @IsUrl() @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  githubUrl?: string;          

  @IsUrl() @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  imageUrl?: string;           

  @IsBoolean() @IsOptional()
  isFrontend?: boolean;       

  @IsBoolean() @IsOptional()
  isBackend?: boolean;         

  @IsArray() @IsOptional()
  techStack?: string[];

  @IsDateString() @IsOptional()
  date?: string;

  @IsDateString() @IsOptional()
  endDate?: string;            
  
  @IsUrl() @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  githubFrontendUrl?: string;

  @IsUrl() @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  githubBackendUrl?: string;

  @IsUrl() @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  demoVideo?: string;

  @IsArray() @IsOptional()
  @IsString({ each: true })
  demoImages?: string[];

  @IsString() @IsOptional()
  workDone?: string;

  @IsArray() @IsOptional()
  @IsString({ each: true })
  features?: string[];
}

export class Step5ProjectsDto {
  @ApiProperty({
    description: 'Array of project portfolios',
    type: [ProjectDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectDto)
  projects: ProjectDto[];
}
