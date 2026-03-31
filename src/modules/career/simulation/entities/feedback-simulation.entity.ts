import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Simulation } from "./simulation.entity";

@Entity("feedback_simulation")
export class FeedbackSimulation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  strengths: string;

  @Column()
  improvements: string;

  @Column({ type: 'jsonb' })
  detailedScores: object;

  @OneToOne(() => Simulation, (simulation: Simulation) => simulation.feedback)
  @JoinColumn()
  feedback: Simulation;
}