import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsNumber,
  Min,
  Max,
  ValidateNested,
  IsNotEmpty,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

// Enums for validation
export enum SalaryType {
  GROSS = 'gross',
  NET = 'net',
}

export enum ContractTypeEnum {
  CDI = 'cdi',
  CDD = 'cdd',
  STAGE = 'stage',
  FREELANCE = 'freelance',
  INTERIM = 'interim',
}

export enum RemoteTypeEnum {
  FULL_REMOTE = 'full_remote',
  HYBRID = 'hybrid',
  ONSITE = 'onsite',
}

export enum SectorInterestLevel {
  NOT_INTERESTED = 'not_interested',
  SOMEWHAT_INTERESTED = 'somewhat_interested',
  VERY_INTERESTED = 'very_interested',
}

export enum AvailabilityEnum {
  IMMEDIATE = 'immediate',
  TWO_WEEKS = 'two_weeks',
  ONE_MONTH = 'one_month',
  TWO_MONTHS = 'two_months',
  THREE_MONTHS = 'three_months',
}

// Nested DTOs
export class SectorPreferenceDto {
  @ApiProperty({
    description: 'Industry or sector name',
    example: 'Technology',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Level of interest in the sector',
    enum: SectorInterestLevel,
    example: SectorInterestLevel.VERY_INTERESTED,
  })
  @IsEnum(SectorInterestLevel)
  interest: SectorInterestLevel;

  @ApiProperty({
    description: 'Weight or priority (1-5)',
    minimum: 1,
    maximum: 5,
    example: 5,
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  weight: number;
}

export class ContractTypeItemDto {
  @ApiProperty({
    description: 'Type of employment contract',
    enum: ContractTypeEnum,
    example: ContractTypeEnum.CDI,
  })
  @IsEnum(ContractTypeEnum)
  type: ContractTypeEnum;

  @ApiProperty({
    description: 'Whether this is the preferred contract type',
    example: true,
    required: false,
  })
  @IsOptional()
  preferred?: boolean;
}

export class RemotePreferenceDto {
  @ApiProperty({
    description: 'Remote work preference type',
    enum: RemoteTypeEnum,
    example: RemoteTypeEnum.HYBRID,
  })
  @IsEnum(RemoteTypeEnum)
  type: RemoteTypeEnum;

  @ApiProperty({
    description: 'Number of hybrid work days (only for hybrid type)',
    minimum: 1,
    maximum: 5,
    example: 3,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  hybridDays?: number; // Only relevant for hybrid type
}

// Main validation DTO
export class TargetProfileValidationDto {
  

  @ApiProperty({
    description: 'Target job positions',
    example: ['Full Stack Developer', 'Backend Developer'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  targetPositions?: string[];

  @ApiProperty({
    description: 'Sector preferences with interest levels',
    type: [SectorPreferenceDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectorPreferenceDto)
  sectorPreferences?: SectorPreferenceDto[];

  @ApiProperty({
    description: 'Minimum expected salary',
    example: 30000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minSalary?: number;

  @ApiProperty({
    description: 'Maximum expected salary',
    example: 60000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxSalary?: number;

  @ApiProperty({
    description: 'Salary type (gross or net)',
    enum: SalaryType,
    example: SalaryType.NET,
    required: false,
  })
  @IsOptional()
  @IsEnum(SalaryType)
  salaryType?: SalaryType;

  @ApiProperty({
    description: 'Preferred contract types',
    type: [ContractTypeItemDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ContractTypeItemDto)
  contractTypes?: ContractTypeItemDto[];

  @ApiProperty({
    description: 'Target cities for work',
    example: ['Tunis', 'Paris', 'Seoul'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  targetCities?: string[];

  @ApiProperty({
    description: 'Remote work preference',
    type: RemotePreferenceDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RemotePreferenceDto)
  remotePreference?: RemotePreferenceDto;

  @ApiProperty({
    description: 'When availability to start work',
    enum: AvailabilityEnum,
    example: AvailabilityEnum.IMMEDIATE,
    required: false,
  })
  @IsOptional()
  @IsEnum(AvailabilityEnum)
  availability?: AvailabilityEnum;
}
