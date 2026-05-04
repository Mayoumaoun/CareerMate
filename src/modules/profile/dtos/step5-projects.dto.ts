import { IsString, IsNotEmpty, IsArray, IsOptional, IsUrl, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ProjectDto {
  @ApiProperty({
    description: 'Project title',
    example: 'E-commerce Platform',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Project id (for already existing projects, not needed for new ones)',
    example: 'project-123',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  projectId: string;

  @ApiProperty({
    description: 'Project context (academic, personal, professional)',
    example: 'personal',
  })
  @IsString()
  @IsNotEmpty()
  context: string; // academique, perso, etc.

  @ApiProperty({
    description: 'Project description',
    example: 'Built a full-stack e-commerce platform with React and Node.js',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Project URL',
    example: 'https://myecommerce.com',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  projectUrl?: string;

  @ApiProperty({
    description: 'GitHub repository URL',
    example: 'https://github.com/username/ecommerce',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  githubUrl?: string;

  @ApiProperty({
    description: 'Technology stack used',
    example: ['React', 'Node.js', 'MongoDB'],
    required: false,
  })
  @IsArray()
  @IsOptional()
  techStack?: string[];

  @ApiProperty({
    description: 'Project completion date in ISO 8601 format',
    example: '2025-12-15',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  date?: string;
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
