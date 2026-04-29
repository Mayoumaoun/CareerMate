import * as jsonSchemas from "src/common/types/json-schemas";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from "typeorm";
import { UserEntity } from "src/modules/user/entities/user.entity";

export enum JobOfferStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CLOSED = 'closed',
}

@Entity("job_offer")
export class JobOfferEntity {
    @PrimaryColumn('uuid')
    id: string;

    @Column()
    title: string;

    @Column()
    company: string;

    @Column()
    location: string;
    
    @Column()
    description: string;
    
    @Column()
    url: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({type:'timestamp', nullable: true })
    expiresAt: Date | null;

    @Column()
    source: string;

    @Column({ type: 'enum', enum: JobOfferStatus })
    status: JobOfferStatus;

    @Column('jsonb', { nullable: true })
    extraInfo: jsonSchemas.JobOfferEXtraInfo;

    @ManyToOne(() => UserEntity, (user: UserEntity) => user.jobOffers)
    @JoinColumn()
    user: UserEntity;

}