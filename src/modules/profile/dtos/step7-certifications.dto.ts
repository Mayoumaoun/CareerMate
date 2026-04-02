import { IsString, IsNotEmpty, IsArray, ValidateNested, IsOptional, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';

export class CertificationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  organization: string;

  @IsString()
  @IsNotEmpty()
  date: string; // ISO 8601 format

  @IsString()
  @IsNotEmpty()
  domain: string;

  @IsString()
  @IsNotEmpty()
  context: string;

  @IsUrl()
  @IsOptional()
  url?: string;
}

export class Step7CertificationsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CertificationDto)
  certifications: CertificationDto[];
}
