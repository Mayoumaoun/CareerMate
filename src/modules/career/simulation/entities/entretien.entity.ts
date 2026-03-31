import { ChildEntity, Column } from "typeorm";
import { Simulation, SimulationType } from "./simulation.entity";

enum EntretienType {}
@ChildEntity(SimulationType.ENTRETIEN)
export class EntretienEntity extends Simulation {
  @Column({ type: 'enum', enum: EntretienType })
  entretienType: EntretienType;

   @Column("text", { array: true })
  questions: string[];
}