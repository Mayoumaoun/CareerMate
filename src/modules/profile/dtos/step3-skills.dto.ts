import { IsString, IsNotEmpty, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';



export enum SkillLevelEnum {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

export class SkillDto {
  @IsString()
  @IsNotEmpty()
  name: string;


  @IsEnum(SkillLevelEnum)
  @IsNotEmpty()
  level: SkillLevelEnum;
}

export class Step3SkillsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillDto)
  skills: SkillDto[];
}
