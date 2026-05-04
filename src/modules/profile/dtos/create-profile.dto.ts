import { IsNotEmpty, ValidateNested, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { Step1PersonalInfoDto } from './step1-personal-info.dto';
import { TargetProfileValidationDto } from './target-profile-validation.dto';

export class CreateProfileDto {
  @ApiProperty({
    description: 'Personal information (Step 1)',
    type: Step1PersonalInfoDto,
    example: { firstName: 'Ouma', lastName: 'Oun', phone: '+21650000000', country: 'Tunisia', city: 'Tunis', dateOfBirth: '1990-01-01', gender: 'Female' },
  })
  @ValidateNested()
  @Type(() => Step1PersonalInfoDto)
  @IsNotEmpty()
  step1: Step1PersonalInfoDto;

  @ApiProperty({
    description: 'User biography',
    example: 'Full-stack developer with 5 years of experience',
    required: false,
  })
  @IsOptional()
  @IsString()
  bio?: string;

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
