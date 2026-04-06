import { IsNotEmpty, ValidateNested, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { Step1PersonalInfoDto } from './step1-personal-info.dto';
import { Step2EducationDto } from './step2-education.dto';
import { Step3SkillsDto } from './step3-skills.dto';
import { Step4ExperiencesDto } from './step4-experiences.dto';
import { Step5ProjectsDto } from './step5-projects.dto';
import { Step6LanguagesDto } from './step6-languages.dto';
import { Step7CertificationsDto } from './step7-certifications.dto';
import { TargetProfileValidationDto } from './target-profile-validation.dto';
export class UpdateProfileDto {
  @ValidateNested()
  @Type(() => Step1PersonalInfoDto)
  @IsOptional()
  step1?: Step1PersonalInfoDto;

  @ValidateNested()
  @Type(() => Step2EducationDto)
  @IsOptional()
  step2?: Step2EducationDto;

  @ValidateNested()
  @Type(() => Step3SkillsDto)
  @IsOptional()
  step3?: Step3SkillsDto;

  @ValidateNested()
  @Type(() => Step4ExperiencesDto)
  @IsOptional()
  step4?: Step4ExperiencesDto;

  @ValidateNested()
  @Type(() => Step5ProjectsDto)
  @IsOptional()
  step5?: Step5ProjectsDto;

  @ValidateNested()
  @Type(() => Step6LanguagesDto)
  @IsOptional()
  step6?: Step6LanguagesDto;

  @ValidateNested()
  @Type(() => Step7CertificationsDto)
  @IsOptional()
  step7?: Step7CertificationsDto;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  targetPosition?: string;

  @IsOptional()
  @IsString()
  shortTermGoals?: string;

  @IsOptional()
  @IsString()
  longTermGoals?: string;

  @ValidateNested()
  @Type(() => TargetProfileValidationDto)
  @IsOptional()
  targetProfile?: TargetProfileValidationDto;
}
