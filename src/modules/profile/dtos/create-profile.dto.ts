import { IsNotEmpty, ValidateNested, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { Step1PersonalInfoDto } from './step1-personal-info.dto';
import { TargetProfileValidationDto } from './target-profile-validation.dto';

export class CreateProfileDto {
  @ValidateNested()
  @Type(() => Step1PersonalInfoDto)
  @IsNotEmpty()
  step1: Step1PersonalInfoDto;

  @IsOptional()
  @IsString()
  bio?: string;

  @ValidateNested()
  @Type(() => TargetProfileValidationDto)
  @IsOptional()
  targetProfile?: TargetProfileValidationDto;
}
