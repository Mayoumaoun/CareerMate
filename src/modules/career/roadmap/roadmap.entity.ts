import {Column,CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn} from 'typeorm';
import { UserEntity } from 'src/modules/user/entities/user.entity';
import { RoadmapMode, RoadmapStatus } from './roadmap.enums';
import * as roadmapTypes from './roadmap.types';

@Entity('roadmap')
export class RoadmapEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  title: string | null;

  @Column()
  targetJob: string;

  @Column({ type: 'enum', enum: RoadmapMode })
  mode: RoadmapMode;

  @Column({ type: 'enum', enum: RoadmapStatus, default: RoadmapStatus.DRAFT })
  status: RoadmapStatus;

  @Column({ type: 'jsonb', default: [] })
  steps: roadmapTypes.RoadmapStep[];

  @Column({ type: 'jsonb', nullable: true })
  generationParams: roadmapTypes.GenerationParams| null;

  @Column({ type: 'jsonb', nullable: true })
  profileSnapshotHash: string | null;

  @Column({ type: 'date', nullable: true })
  startDate: Date | null;

  @Column({ type: 'date', nullable: true })
  endDate: Date | null;

  @Column({ default: false })
  isDeleted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => UserEntity, (user: UserEntity) => user.roadmaps)
  @JoinColumn()
  user: UserEntity;
}
