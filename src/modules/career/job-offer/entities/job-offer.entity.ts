import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../../../user/entities/user.entity';

@Entity()
export class JobOffer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  company: string;

  @Column({ nullable: true })
  location: string;

  @Column({ default: false })
  remote: boolean;

  @Column({ nullable: true })
  experienceLevel: string;

  @Column({ nullable: true })
  salaryMin: number;

  @Column({ nullable: true })
  salaryMax: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  url: string;

  @Column({ nullable: true })
  source: string;

  @Column({ type: 'jsonb', nullable: true })
  extractedSkills: { skill_name: string; importance: number }[];

  @Column({ type: 'vector', length: 384, nullable: true })
  embedding: number[];

  @ManyToOne(() => UserEntity, (user: UserEntity) => user.jobOffers, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  user?: UserEntity;

  @CreateDateColumn()
  createdAt: Date;
}
