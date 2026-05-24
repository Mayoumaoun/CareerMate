// dto/create-entretien.dto.ts
import { IsEnum, IsOptional, IsString } from 'class-validator';
import {
  EntretienType,
  EntretienLanguage,
  EntretienLevel,
} from '../entities/entretien.entity';
import { SimulationMode } from '../entities/simulation.entity';

export class CreateEntretienDto {
  @IsString()
  @IsOptional()
  jobOfferId?: string;

  @IsString()
  @IsOptional()
  company?: string;

  @IsString()
  @IsOptional()
  position?: string;

  @IsEnum(EntretienType)
  @IsOptional()
  entretienType?: EntretienType;

  @IsEnum(EntretienLanguage)
  @IsOptional()
  language?: EntretienLanguage;

  @IsEnum(EntretienLevel)
  @IsOptional()
  level?: EntretienLevel;

  @IsEnum(SimulationMode)
  @IsOptional()
  mode?: SimulationMode;
}
