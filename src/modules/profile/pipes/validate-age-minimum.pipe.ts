import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';

@Injectable()
export class ValidateAgeMinimumPipe implements PipeTransform {
  transform(dateOfBirth: any) {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 16) {
      throw new BadRequestException('User must be at least 16 years old');
    }

    return dateOfBirth;
  }
}
