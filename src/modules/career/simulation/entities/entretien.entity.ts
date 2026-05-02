import { ChildEntity, Column, OneToMany } from 'typeorm';
import { Simulation, SimulationType } from './simulation.entity';
import { EntretienAnswerEntity } from './entretien-answer.entity';

export enum EntretienType {
  TECHNIQUE = 'technique',
  COMPORTEMENTAL = 'comportemental',
  MIXTE = 'mixte',
}

export enum EntretienStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export enum EntretienLanguage {
  FR = 'fr',
  EN = 'en',
}

export enum EntretienLevel {
  JUNIOR = 'junior',
  MID = 'mid',
  SENIOR = 'senior',
}

@ChildEntity(SimulationType.ENTRETIEN)
export class EntretienEntity extends Simulation {
  @Column({ type: 'enum', enum: EntretienType, default: EntretienType.MIXTE })
  entretienType: EntretienType;

  @Column({
    type: 'enum',
    enum: EntretienStatus,
    default: EntretienStatus.PENDING,
  })
  status: EntretienStatus;

  @Column({
    type: 'enum',
    enum: EntretienLanguage,
    default: EntretienLanguage.FR,
  })
  language: EntretienLanguage;

  @Column({
    type: 'enum',
    enum: EntretienLevel,
    default: EntretienLevel.JUNIOR,
  })
  level: EntretienLevel;

  @Column()
  company: string;

  @Column()
  position: string;

  @Column({ nullable: true })
  jobOfferId: string | null;

  @Column('text', { array: true, default: [] })
  questions: string[];

  @Column({ default: 0 })
  currentQuestionIndex: number;

  @Column({ type: 'text', nullable: true })
  report: string | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @OneToMany(() => EntretienAnswerEntity, (answer) => answer.entretien, {
    cascade: true,
  })
  answers: EntretienAnswerEntity[];
}
