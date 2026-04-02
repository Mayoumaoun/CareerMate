import { IsDate, IsEmail, IsEnum, IsOptional, IsPhoneNumber, IsString, IsStrongPassword } from "class-validator";
import { Gender } from "../entities/user.entity";
import { Type } from "class-transformer";

export class CreateUserDto{
    @IsEmail()
    email: string;

    @IsString()
    // @IsStrongPassword()
    password: string;

    @IsString()
    firstName: string;

    @IsString()
    lastName: string;

    @IsPhoneNumber()
    // @IsOptional()
    phone: string;

    @IsString()
    // @IsOptional()
    country: string;

    @IsString()
    // @IsOptional()
    city: string;

    @IsDate()
    // @IsOptional()
    @Type(() => Date)
    birthdate: Date;

    @IsEnum(Gender)
    gender: Gender;
}