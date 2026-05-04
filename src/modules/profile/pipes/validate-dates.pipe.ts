import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';

@Injectable()
export class ValidateDatesPipe implements PipeTransform {
  transform(value: any) {
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        this.validateDateRange(item, index);
      });
    } else if (typeof value === 'object') {
      this.validateDateRange(value, 0);
    }

    return value;
  }

  private validateDateRange(item: any, index: number = 0) {
    if (item && item.startDate && item.endDate) {
      const startDate = new Date(item.startDate);
      const endDate = new Date(item.endDate);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new BadRequestException(
          `Invalid date format at index ${index}. Use ISO 8601 format (YYYY-MM-DD)`,
        );
      }

      if (startDate > endDate) {
        throw new BadRequestException(
          `Start date cannot be after end date at index ${index}`,
        );
      }

      const maxDate = new Date();
      if (endDate > maxDate) {
        throw new BadRequestException(
          `End date cannot be in the future at index ${index}`,
        );
      }
    } else if (item && item.startDate) {
      const startDate = new Date(item.startDate);
      if (isNaN(startDate.getTime())) {
        throw new BadRequestException(
          `Invalid date format at index ${index}. Use ISO 8601 format (YYYY-MM-DD)`,
        );
      }
    }
  }
}
