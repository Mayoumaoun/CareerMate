import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';

@Injectable()
export class ValidatePhonePipe implements PipeTransform {
  transform(value: any) {
    // Accepte les formats :
    // - +216XXXXXXXX ou +216 XX XXX XXX (international)
    // - 00216XXXXXXXX (international avec 00)
    // - 0XXXXXXXXX (local avec 0)
    // - 216XXXXXXXX (sans + ni 00)
    const tunisianPhoneRegex = /^(?:\+216|00216|0|216)?\s*[245679]\d{7,8}$/;
    
    if (value && !tunisianPhoneRegex.test(value.replace(/\s|-/g, ''))) {
      throw new BadRequestException(
        `Invalid Tunisian phone number: ${value}. Expected format: +216XXXXXXXX or 0XXXXXXXXX`,
      );
    }
    
    return value;
  }
}
