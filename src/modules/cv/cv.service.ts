import { Injectable } from '@nestjs/common';
import { Multer } from 'multer';
import { CvEntity } from './cv.entity';

@Injectable()
export class CvService {
  async uploadCV(file: Express.Multer.File) {
    // TODO
  }

  async suggestAtsFixes(file: Express.Multer.File, jobOffer: string) {
    // TODO
  }

  async optimizeCV(file: Express.Multer.File, dto: CvEntity) {
    // TODO
  }

  async generateFromScratch(dto: CvEntity) {
    // TODO
  }
}
