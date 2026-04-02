import { IsString, IsNotEmpty, IsEnum, IsArray, ValidateNested, IsOptional, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';

export enum LanguageLevelEnum {
  A1 = 'A1',
  A2 = 'A2',
  B1 = 'B1',
  B2 = 'B2',
  C1 = 'C1',
  C2 = 'C2',
  NATIVE = 'native',
}

export class LanguageDto {
  @IsString()
  @IsNotEmpty()
  language: string;

  @IsEnum(LanguageLevelEnum)
  @IsNotEmpty()
  level: LanguageLevelEnum;

  @IsUrl()
  @IsOptional()
  certificate?: string; // URL du certificat
}

export class Step6LanguagesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LanguageDto)
  languages: LanguageDto[];
}
