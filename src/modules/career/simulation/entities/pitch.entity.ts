import { ChildEntity, Column } from "typeorm";
import { Simulation, SimulationType } from "./simulation.entity";

enum PitchMode{
  CLASSIQUE = 'CLASSIQUE',
  STORYTELLING = 'STORYTELLING',
  CONVAINCANT = 'CONVAINCANT',
}
@ChildEntity(SimulationType.PITCH)
export class PitchEntity extends Simulation {
  @Column({ type: 'enum', enum: PitchMode })
  entretienType: PitchMode;

  @Column()
  script: string;

  @Column()
  durationSeconds: number;
}