import { IsNotEmpty, ValidateNested, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { Step1PersonalInfoDto } from './step1-personal-info.dto';
import { Step2EducationDto } from './step2-education.dto';
import { Step3SkillsDto } from './step3-skills.dto';
import { Step4ExperiencesDto } from './step4-experiences.dto';
import { Step5ProjectsDto } from './step5-projects.dto';
import { Step6LanguagesDto } from './step6-languages.dto';
import { Step7CertificationsDto } from './step7-certifications.dto';
import { TargetProfileValidationDto } from './target-profile-validation.dto';
export class UpdateProfileDto {
  @ApiProperty({
    description: 'Personal information (Step 1)',
    type: Step1PersonalInfoDto,
    required: false,
  })
  @ValidateNested()
  @Type(() => Step1PersonalInfoDto)
  @IsOptional()
  step1?: Step1PersonalInfoDto;

  @ApiProperty({
    description: 'Education information (Step 2)',
    type: Step2EducationDto,
    required: false,
  })
  @ValidateNested()
  @Type(() => Step2EducationDto)
  @IsOptional()
  step2?: Step2EducationDto;

  @ApiProperty({
    description: 'Skills information (Step 3)',
    type: Step3SkillsDto,
    required: false,
  })
  @ValidateNested()
  @Type(() => Step3SkillsDto)
  @IsOptional()
  step3?: Step3SkillsDto;

  @ApiProperty({
    description: 'Experiences information (Step 4)',
    type: Step4ExperiencesDto,
    required: false,
  })
  @ValidateNested()
  @Type(() => Step4ExperiencesDto)
  @IsOptional()
  step4?: Step4ExperiencesDto;

  @ApiProperty({
    description: 'Projects information (Step 5)',
    type: Step5ProjectsDto,
    required: false,
  })
  @ValidateNested()
  @Type(() => Step5ProjectsDto)
  @IsOptional()
  step5?: Step5ProjectsDto;

  @ApiProperty({
    description: 'Languages information (Step 6)',
    type: Step6LanguagesDto,
    required: false,
  })
  @ValidateNested()
  @Type(() => Step6LanguagesDto)
  @IsOptional()
  step6?: Step6LanguagesDto;

  @ApiProperty({
    description: 'Certifications information (Step 7)',
    type: Step7CertificationsDto,
    required: false,
  })
  @ValidateNested()
  @Type(() => Step7CertificationsDto)
  @IsOptional()
  step7?: Step7CertificationsDto;

  @ApiProperty({
    description: 'User biography',
    example: 'Passionate full-stack developer',
    required: false,
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({
    description: 'Target job position',
    example: 'Senior Full-Stack Developer',
    required: false,
  })
  @IsOptional()
  @IsString()
  targetPosition?: string;

  @ApiProperty({
    description: 'Short-term career goals',
    example: 'Master microservices architecture',
    required: false,
  })
  @IsOptional()
  @IsString()
  shortTermGoals?: string;

  @ApiProperty({
    description: 'Long-term career goals',
    example: 'Become a tech lead',
    required: false,
  })
  @IsOptional()
  @IsString()
  longTermGoals?: string;

  @ApiProperty({
    description: 'Target profile validation',
    type: TargetProfileValidationDto,
    required: false,
  })
  @ValidateNested()
  @Type(() => TargetProfileValidationDto)
  @IsOptional()
  targetProfile?: TargetProfileValidationDto;
}
