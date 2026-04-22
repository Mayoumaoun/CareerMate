import * as jsonSchemas from "src/common/types/json-schemas";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from "typeorm";
import { UserEntity } from "src/modules/user/entities/user.entity";

export enum JobOfferStatus {
    ACTIVE = 'ACTIVE',
    ARCHIVED = 'ARCHIVED',
    DRAFT = 'DRAFT',
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

    @Column({ default: false })
    remote: boolean;

    @Column({ type: 'int', nullable: true })
    salaryMin: number | null;

    @Column({ type: 'int', nullable: true })
    salaryMax: number | null;

    @Column({ type: 'varchar', nullable: true })
    contractType: string | null;
    
    @Column()
    description: string;

    @Column({ type: 'jsonb', default: [] })
    skillsRequired: string[];

    @Column({ type: 'jsonb', nullable: true })
    sourceMetadata: Record<string, unknown> | null;

    @Column({ type: 'jsonb', nullable: true })
    vector: number[] | null;
    
    @Column()
    url: string;

    @Column({ unique: true })
    sourceHash: string;

    @Column({ type: 'timestamp', nullable: true })
    postedAt: Date | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({type:'timestamp', nullable: true })
    expiresAt: Date | null;

    @Column()
    source: string;

    @Column({ type: 'enum', enum: JobOfferStatus, default: JobOfferStatus.ACTIVE })
    status: JobOfferStatus;

    @Column('jsonb', { nullable: true })
    extraInfo: jsonSchemas.JobOfferEXtraInfo;

    @ManyToOne(() => UserEntity, (user: UserEntity) => user.jobOffers)
    @JoinColumn()
    user: UserEntity;

}