import { IsString, IsEmail, IsNotEmpty, IsDateString, IsEnum, IsOptional, Matches } from 'class-validator';

export enum GenderEnum {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
  PREFER_NOT_TO_SAY = 'prefer_not_to_say',
}

export class Step1PersonalInfoDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @Matches(/^(?:\+216|00216|0)?[245679]\d{7,8}$/, {
    message: 'Invalid Tunisian phone number. Accepted formats: +216XXXXXXXX or 0XXXXXXXXX',
  })
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsDateString()
  @IsNotEmpty()
  dateOfBirth: string; 

  @IsEnum(GenderEnum)
  @IsNotEmpty()
  gender: GenderEnum;

}
