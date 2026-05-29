import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class JobDto {
  @ApiProperty({ description: 'Unique job identifier' })
  id: string;

  @ApiProperty({ description: 'Job title' })
  title: string;

  @ApiProperty({ description: 'Company name' })
  company: string;

  @ApiProperty({ description: 'Job location' })
  location: string;

  @ApiProperty({ description: 'Whether the job is remote' })
  remote: boolean;

  @ApiPropertyOptional({ description: 'Minimum salary' })
  salaryMin: number | null;

  @ApiPropertyOptional({ description: 'Maximum salary' })
  salaryMax: number | null;

  @ApiPropertyOptional({ description: 'Contract type (full-time, part-time, etc.)' })
  contractType: string | null;

  @ApiProperty({ description: 'Job description' })
  description: string;

  @ApiProperty({ description: 'Required skills', type: [String] })
  skillsRequired: string[];

  @ApiPropertyOptional({ description: 'Date the job was posted' })
  postedAt: Date | null;

  @ApiProperty({ description: 'Application URL' })
  url: string;

  @ApiProperty({ description: 'Source of the job listing', enum: ['himalayas', 'arbeitnow', 'jsearch', 'tanitjobs'] })
  source: string;
}

export class RankedJobDto extends JobDto {
  @ApiProperty({ description: 'Match score between 0 and 1' })
  score: number;

  @ApiPropertyOptional({ description: 'Skill overlap ratio (0-1)' })
  skillOverlap?: number;

  @ApiPropertyOptional({ description: 'Matched skills from user profile', type: [String] })
  matchedSkills?: string[];

  @ApiPropertyOptional({ description: 'Missing skills the user lacks', type: [String] })
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
