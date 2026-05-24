import { IsNumber, IsOptional, IsString } from 'class-validator';
export class SubmitAnswerDto {
  @IsString()
  answer: string;

  @IsNumber()
  @IsOptional()
  durationSeconds?: number;
}
