import { IsString, IsNotEmpty, IsArray, IsOptional, IsUrl, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ProjectDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  context: string; // academique, perso, etc.

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsUrl()
  @IsOptional()
  projectUrl?: string;

  @IsUrl()
  @IsOptional()
  githubUrl?: string;

  @IsArray()
  @IsOptional()
  techStack?: string[];

  @IsDateString()
  @IsOptional()
  date?: string;
}

export class Step5ProjectsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectDto)
  projects: ProjectDto[];
}
