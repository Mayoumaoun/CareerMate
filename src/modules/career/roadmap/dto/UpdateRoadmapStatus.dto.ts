import { ApiProperty } from "@nestjs/swagger";
import { RoadmapStatus } from "../roadmap.enums";
import { IsEnum } from "class-validator";

export class UpdateRoadmapStatusDto {
  @ApiProperty({ enum: RoadmapStatus })
  @IsEnum(RoadmapStatus)
  status: RoadmapStatus;
}