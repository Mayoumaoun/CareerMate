import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TargetProfileValidationDto } from '../dtos/target-profile-validation.dto';

@Injectable()
export class ValidateTargetProfilePipe implements PipeTransform {
  async transform(value: any): Promise<any> {
    // If no targetProfile is provided, it's optional - skip validation
    if (!value || !value.targetProfile) {
      return value;
    }

    // Validate the targetProfile object
    const targetProfileInstance = plainToInstance(
      TargetProfileValidationDto,
      value.targetProfile,
    );

    const errors = await validate(targetProfileInstance);

    if (errors.length > 0) {
      const errorMessages = errors
        .map((error) => {
          const constraints = Object.values(error.constraints || {});
          return `${error.property}: ${constraints.join(', ')}`;
        })
        .join('; ');

      throw new BadRequestException(
        `Target Profile validation failed: ${errorMessages}`,
      );
    }

    // Additional business logic validations
    const targetProfile = value.targetProfile;

    // Validate salary range if both are provided
    if (
      targetProfile.minSalary &&
      targetProfile.maxSalary &&
      targetProfile.minSalary > targetProfile.maxSalary
    ) {
      throw new BadRequestException(
        'Target Profile validation failed: minSalary must be less than maxSalary',
      );
    }

    // Validate hybrid days only if remote type is hybrid
    if (
      targetProfile.remotePreference &&
      targetProfile.remotePreference.type === 'hybrid' &&
      !targetProfile.remotePreference.hybridDays
    ) {
      throw new BadRequestException(
        'Target Profile validation failed: hybridDays is required when remotePreference type is hybrid',
      );
    }

    return value;
  }
}
