import { IsString, IsEmail, IsNotEmpty, IsDateString, IsEnum, IsOptional, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Gender } from 'src/modules/user/enums/gender.enum';
export class Step1PersonalInfoDto {
  @ApiProperty({
    description: 'User first name',
    example: 'Ouma',
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Oun',
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    description: 'Tunisian phone number',
    example: '+21650000000',
  })
  @Matches(/^(?:\+216|00216|0)?[245679]\d{7,8}$/, {
    message: 'Invalid Tunisian phone number. Accepted formats: +216XXXXXXXX or 0XXXXXXXXX',
  })
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    description: 'Country of residence',
    example: 'Tunisia',
  })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({
    description: 'City of residence',
    example: 'Tunis',
  })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({
    description: 'Date of birth in ISO 8601 format',
    example: '2004-10-06',
  })
  @IsDateString()
  @IsNotEmpty()
  dateOfBirth: string; 

  @ApiProperty({
    description: 'Gender',
    enum: Gender,
    example: Gender.Female,
  })
  @IsEnum(Gender)
  @IsNotEmpty()
  gender: Gender;

}
