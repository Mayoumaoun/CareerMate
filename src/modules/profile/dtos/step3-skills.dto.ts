import { IsString, IsNotEmpty, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';



export enum SkillLevelEnum {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

export class SkillDto {
  @ApiProperty({
    description: 'Skill name',
    example: 'TypeScript',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Proficiency level',
    enum: SkillLevelEnum,
    example: SkillLevelEnum.ADVANCED,
  })
  @IsEnum(SkillLevelEnum)
  @IsNotEmpty()
  level: SkillLevelEnum;
}

export class Step3SkillsDto {
  @ApiProperty({
    description: 'Array of professional skills',
    type: [SkillDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillDto)
  skills: SkillDto[];
}
