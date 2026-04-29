import { UserEntity } from "src/modules/user/entities/user.entity";
import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity('lettre_de_motivation')
export class LettreMotivationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  content: string;

  @Column()
  style: string;
  @Column({ nullable: true })
  company: string | null;

  @Column({ nullable: true })
  position: string | null;

  @Column({ type: 'boolean', nullable: true })
  liked: boolean | null;

  @Column({ type: 'text', nullable: true })
  feedbackComment: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date | null;

  @ManyToOne(() => UserEntity, (user: UserEntity) => user.lettresMotivation)
  @JoinColumn()
  user: UserEntity;
}