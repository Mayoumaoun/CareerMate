import { IsString, IsNotEmpty } from 'class-validator';

export class CreateCandidatureDto {
  @IsString()
  @IsNotEmpty()
  jobOfferId: string;
}
