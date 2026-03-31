import { UserEntity } from "src/modules/user/entities/user.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, TableInheritance } from "typeorm";
import { FeedbackSimulation } from "./feedback-simulation.entity";

export enum SimulationType {
    ENTRETIEN = "entretien",
    PITCH = "pitch",
}
@Entity("simulation")
@TableInheritance({ column: { type: 'enum', name: 'type', enum: SimulationType } })
export class Simulation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  mode: string;

  @Column()
  score: number;

  @CreateDateColumn()
  simulatedAt: Date;

  @ManyToOne(() => UserEntity, (user: UserEntity) => user.simulations)
  @JoinColumn()
  user: UserEntity;

  @OneToOne(() => FeedbackSimulation,{nullable: true})
  feedback: FeedbackSimulation;
}