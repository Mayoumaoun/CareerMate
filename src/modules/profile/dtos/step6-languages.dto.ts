import { IsString, IsNotEmpty, IsEnum, IsArray, ValidateNested, IsOptional, IsUrl } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum LanguageLevelEnum {
  A1 = 'A1',
  A2 = 'A2',
  B1 = 'B1',
  B2 = 'B2',
  C1 = 'C1',
  C2 = 'C2',
}

export class LanguageDto {
  @ApiProperty({
    description: 'Language name',
    example: 'English',
  })
  @IsString()
  @IsNotEmpty()
  language: string;

  @ApiProperty({
    description: 'CEFR language proficiency level',
    enum: LanguageLevelEnum,
    example: LanguageLevelEnum.C2,
  })
  @IsEnum(LanguageLevelEnum)
  @IsNotEmpty()
  level: LanguageLevelEnum;

  @ApiProperty({
    description: 'URL to language proficiency certificate',
    example: 'https://certificates.example.com/english-c1.pdf',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  certificate?: string; // URL du certificat
}

export class Step6LanguagesDto {
  @ApiProperty({
    description: 'Array of language proficiencies',
    type: [LanguageDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LanguageDto)
  languages: LanguageDto[];
}
