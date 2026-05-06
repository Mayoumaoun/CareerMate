import { ApiProperty } from "@nestjs/swagger";

export class UpdateRoadmapStepsDto {
  @ApiProperty({ description: 'Full replacement array of step objects', type: [Object] })
  steps: any[];
}
