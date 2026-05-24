import { IsUUID } from 'class-validator';

export class CreateCandidatureDto {
  @IsUUID()
  jobOfferId: string;
}
