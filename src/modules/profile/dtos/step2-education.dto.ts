import { IsString, IsNotEmpty, IsEnum, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export enum UserLevelEnum {
  STUDENT = 'Student',
  JUNIOR = 'Junior',
  SENIOR = 'Senior',
}

export class DiplomaDto {
  @IsString()
  @IsNotEmpty()
  degree: string;

  @IsString()
  @IsNotEmpty()
  institution: string;

  @IsString()
  @IsNotEmpty()
  field: string;

  @IsString()
  @IsNotEmpty()
  startDate: string; // ISO 8601 format

  @IsString()
  @IsNotEmpty()
  endDate: string;
 
}

export class Step2EducationDto {
  @IsEnum(UserLevelEnum)
  @IsNotEmpty()
  userLevel: UserLevelEnum;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiplomaDto)
  education: DiplomaDto[];
}
