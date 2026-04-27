import { IsString, IsNotEmpty, IsEnum, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum UserLevelEnum {
  STUDENT = 'Student',
  JUNIOR = 'Junior',
  SENIOR = 'Senior',
}

export class DiplomaDto {
  @ApiProperty({
    description: 'Degree or qualification name',
    example: 'Software Engineering Degree',
  })
  @IsString()
  @IsNotEmpty()
  degree: string;

  @ApiProperty({
    description: 'Educational institution name',
    example: 'INSAT',
  })
  @IsString()
  @IsNotEmpty()
  institution: string;

  @ApiProperty({
    description: 'Field of study',
    example: 'Computer Science',
  })
  @IsString()
  @IsNotEmpty()
  field: string;

  @ApiProperty({
    description: 'Start date in ISO 8601 format',
    example: '2023-09-01',
  })
  @IsString()
  @IsNotEmpty()
  startDate: string; // ISO 8601 format

  @ApiProperty({
    description: 'End date in ISO 8601 format',
    example: '2027-06-30',
    required: false,
  })
  @IsString()
  @IsOptional()
  endDate?: string; // Optionnel - défaut = startDate
  @IsString()
  @IsNotEmpty()
  location: string;
 
}

export class Step2EducationDto {
  @ApiProperty({
    description: 'User experience level',
    enum: UserLevelEnum,
    example: UserLevelEnum.JUNIOR,
  })
  @IsEnum(UserLevelEnum)
  @IsNotEmpty()
  userLevel: UserLevelEnum;

  @ApiProperty({
    description: 'Array of education records',
    type: [DiplomaDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiplomaDto)
  education: DiplomaDto[];
}
