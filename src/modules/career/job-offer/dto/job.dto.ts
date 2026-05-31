import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';


export class JobDto {
  @ApiProperty({ description: 'Unique job identifier' })
  id: string;

  @ApiProperty({ description: 'Source platform of the job listing' })
  source: string;

  @ApiProperty({ description: 'Job title' })
  title: string;

  @ApiProperty({ description: 'Company name' })
  company: string;

  @ApiProperty({ description: 'Full job description' })
  description: string;

  @ApiPropertyOptional({ description: 'Short excerpt or summary of the job' })
  excerpt: string | null;

  @ApiProperty({
    description: 'Employment type (e.g. full-time, part-time, contract)',
  })
  employmentType: string;

  @ApiProperty({
    description: 'Work arrangement (e.g. remote, on-site, hybrid)',
  })
  workArrangement: string;

  @ApiPropertyOptional({
    description: 'Seniority level (e.g. junior, mid, senior)',
  })
  seniorityLevel: string | null;

  @ApiPropertyOptional({ description: 'Job function / department' })
  jobFunction: string | null;

  @ApiPropertyOptional({ description: 'Job location' })
  location: string | null;

  @ApiProperty({ description: 'Required skills', type: [String] })
  skillsRequired: string[];

  @ApiPropertyOptional({ description: 'Minimum salary' })
  salaryMin: number | null;

  @ApiPropertyOptional({ description: 'Maximum salary' })
  salaryMax: number | null;

  @ApiPropertyOptional({ description: 'Salary currency (ISO 4217, e.g. USD, EUR)' })
  salaryCurrency: string | null;

  @ApiPropertyOptional({ description: 'Required years of experience' })
  requiredExperienceYears: number | null;

  @ApiPropertyOptional({
    description: 'Education requirement',
    type: 'object',
    properties: {
      level: { type: 'string', example: 'Bachelor' },
      field: { type: 'string', example: 'Computer Science' },
    },
  })
  educationRequired: { level: string; field: string } | null;

  @ApiPropertyOptional({ description: 'Date the job was posted' })
  postedAt: Date | null;

  @ApiProperty({ description: 'Original job listing URL' })
  url: string;
}


export class RankedJobDto extends JobDto {
  @ApiProperty({ description: 'Match score between 0 and 1' })
  score: number;

  @ApiPropertyOptional({ description: 'Skill overlap ratio (0–1)' })
  skillOverlap?: number;

  @ApiPropertyOptional({ description: 'Skills matched from user profile', type: [String] })
  matchedSkills?: string[];

  @ApiPropertyOptional({ description: 'Skills the user is missing', type: [String] })
  missingSkills?: string[];
}


export class JobSearchResponseDto {
  @ApiProperty({ description: 'Ranked job results', type: [RankedJobDto] })
  jobs: RankedJobDto[];

  @ApiProperty({ description: 'Total number of candidates evaluated' })
  totalCandidates: number;

  @ApiProperty({ description: 'Whether results were served from cache' })
  cached: boolean;
}