import { IsString, IsNotEmpty, IsArray, ValidateNested, IsOptional, IsUrl } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CertificationDto {
  @ApiProperty({
    description: 'Certification name',
    example: 'AWS Certified Solutions Architect',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Certifying organization',
    example: 'Amazon Web Services',
  })
  @IsString()
  @IsNotEmpty()
  organization: string;

  @ApiProperty({
    description: 'Certification date in ISO 8601 format',
    example: '2025-06-20',
  })
  @IsString()
  @IsNotEmpty()
  date: string; // ISO 8601 format

  @ApiProperty({
    description: 'Certification domain or topic',
    example: 'Cloud Architecture',
  })
  @IsString()
  @IsNotEmpty()
  domain: string;

  @ApiProperty({
    description: 'Certification context',
    example: 'Professional Development',
  })
  @IsString()
  @IsNotEmpty()
  context: string;

  @ApiProperty({
    description: 'URL to certification credential',
    example: 'https://credentials.example.com/aws-cert-123',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  url?: string;
}

export class Step7CertificationsDto {
  @ApiProperty({
    description: 'Array of professional certifications',
    type: [CertificationDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CertificationDto)
  certifications: CertificationDto[];
}
