import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';

@Injectable()
export class ValidateSkillsPipe implements PipeTransform {
  private readonly MAX_SKILLS = 50;
  private readonly MAX_SKILL_NAME_LENGTH = 50;

  transform(value: any) {
    // Extract skills array from request body
    const skills = value.skills;

    if (!Array.isArray(skills)) {
      throw new BadRequestException('Skills must be an array');
    }

    if (skills.length === 0) {
      throw new BadRequestException('At least one skill is required');
    }

    if (skills.length > this.MAX_SKILLS) {
      throw new BadRequestException(`Maximum ${this.MAX_SKILLS} skills allowed`);
    }

    const skillNames = skills.map(s => s.name.toLowerCase());
    if (new Set(skillNames).size !== skillNames.length) {
      throw new BadRequestException('Duplicate skills are not allowed');
    }

    skills.forEach((skill, index) => {
      if (skill.name.length > this.MAX_SKILL_NAME_LENGTH) {
        throw new BadRequestException(
          `Skill name at index ${index} must not exceed ${this.MAX_SKILL_NAME_LENGTH} characters`,
        );
      }
    });

    return value;
  }
}
