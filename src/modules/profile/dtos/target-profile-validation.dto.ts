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
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(SectorInterestLevel)
  interest: SectorInterestLevel;

  @IsNumber()
  @Min(1)
  @Max(5)
  weight: number;
}

export class ContractTypeItemDto {
  @IsEnum(ContractTypeEnum)
  type: ContractTypeEnum;

  @IsOptional()
  preferred?: boolean;
}

export class RemotePreferenceDto {
  @IsEnum(RemoteTypeEnum)
  type: RemoteTypeEnum;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  hybridDays?: number; // Only relevant for hybrid type
}

// Main validation DTO
export class TargetProfileValidationDto {
  

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  targetPositions?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectorPreferenceDto)
  sectorPreferences?: SectorPreferenceDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  minSalary?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxSalary?: number;

  @IsOptional()
  @IsEnum(SalaryType)
  salaryType?: SalaryType;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ContractTypeItemDto)
  contractTypes?: ContractTypeItemDto[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  targetCities?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => RemotePreferenceDto)
  remotePreference?: RemotePreferenceDto;

  @IsOptional()
  @IsEnum(AvailabilityEnum)
  availability?: AvailabilityEnum;
}
