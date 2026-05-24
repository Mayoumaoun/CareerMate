import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';

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
  tone: Tone;

  @IsString()
  @IsOptional()
  jobDescription?: string;

  @IsString()
  @IsOptional()
  jobOfferId?: string; 
}


export class FeedbackDto {
  @IsBoolean()
  @IsOptional()
  liked?: boolean;

  @IsString()
  @IsOptional()
  feedbackComment?: string;
}
