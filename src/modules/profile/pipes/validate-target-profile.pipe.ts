import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TargetProfileValidationDto } from '../dtos/target-profile-validation.dto';

@Injectable()
export class ValidateTargetProfilePipe implements PipeTransform {
  async transform(value: any): Promise<any> {
    const targetProfileKeys = [
      'targetPositions',
      'sectorPreferences',
      'minSalary',
      'maxSalary',
      'salaryType',
      'contractTypes',
      'targetCities',
      'remotePreference',
      'availability',
    ];

    const hasDirectTargetProfileShape =
      value &&
      typeof value === 'object' &&
      targetProfileKeys.some((key) => key in value);

    // Support both payload shapes:
    // 1) { targetProfile: { ... } } (complete profile update)
    // 2) { ... } (step 8 direct payload)
    const targetProfilePayload = value?.targetProfile ?? (hasDirectTargetProfileShape ? value : null);

    // If no target profile payload is provided, it's optional - skip validation
    if (!targetProfilePayload) {
      return value;
    }

    // Validate the targetProfile object
    const targetProfileInstance = plainToInstance(
      TargetProfileValidationDto,
      targetProfilePayload,
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
    const targetProfile = targetProfilePayload;
    const hasMinSalary =
      targetProfile.minSalary !== undefined && targetProfile.minSalary !== null;
    const hasMaxSalary =
      targetProfile.maxSalary !== undefined && targetProfile.maxSalary !== null;

    // Validate salary values are not negative
    if (hasMinSalary && targetProfile.minSalary < 0) {
      throw new BadRequestException(
        'Target Profile validation failed: minSalary cannot be negative',
      );
    }

    if (hasMaxSalary && targetProfile.maxSalary < 0) {
      throw new BadRequestException(
        'Target Profile validation failed: maxSalary cannot be negative',
      );
    }

    // Validate salary range if both are provided
    if (hasMinSalary && hasMaxSalary && targetProfile.minSalary >= targetProfile.maxSalary) {
      throw new BadRequestException(
        'Target Profile validation failed: minSalary must be strictly less than maxSalary',
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
