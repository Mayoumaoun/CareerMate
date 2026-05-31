import { IsString, IsEnum, IsOptional, IsBoolean, IsUUID } from 'class-validator';
import { UUID } from 'crypto';

export enum Tone {
  PROFESSIONAL = 'professional',
  FRIENDLY = 'friendly',
  ENTHUSIASTIC = 'enthusiastic',
  CONFIDENT = 'confident',
}

export class GenerateLettreMotivationDto {
  @IsString()
  @IsOptional()
  company?: string;

  @IsString()
  @IsOptional()
  position?: string;

  @IsEnum(Tone)
  @IsOptional()
  tone: Tone = Tone.PROFESSIONAL;

  @IsString()
  @IsOptional()
  jobDescription?: string;

  @IsUUID()
  @IsOptional()
  jobOfferId?: UUID; 
}


export class FeedbackDto {
  @IsBoolean()
  @IsOptional()
  liked?: boolean;

  @IsString()
  @IsOptional()
  feedbackComment?: string;
}
