import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EntretienEntity } from './entretien.entity';

@Entity('entretien_answer')
export class EntretienAnswerEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  questionIndex: number;

  @Column('text')
  question: string;

  @Column('text')
  answer: string;

  @Column({ type: 'float', nullable: true })
  score: number | null; // 0-100

  @Column({ type: 'text', nullable: true })
  feedback: string | null;

  @Column({ type: 'int', nullable: true })
  durationSeconds: number | null;

  @CreateDateColumn()
  answeredAt: Date;

  @ManyToOne(() => EntretienEntity, (entretien) => entretien.answers)
  @JoinColumn()
  entretien: EntretienEntity;
}
