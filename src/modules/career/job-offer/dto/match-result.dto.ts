import { ApiProperty } from '@nestjs/swagger';

export class MatchResultDto {
  @ApiProperty({ description: 'List of matching skills' })
  matched: string[];

  @ApiProperty({ description: 'List of missing skills' })
  missing: string[];

  @ApiProperty({ description: 'Advice from the career advisor LLM' })
  advice: string;
}
