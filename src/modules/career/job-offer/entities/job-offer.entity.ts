import * as jsonSchemas from "src/common/types/json-schemas";
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from "typeorm";
import { UserEntity } from "src/modules/user/entities/user.entity";

export enum JobOfferStatus {
    ACTIVE = 'ACTIVE',
    EXPIRED = 'expired',
    CLOSED = 'closed',
    ARCHIVED = 'ARCHIVED',
    DRAFT = 'DRAFT',
}

@Entity("job_offer")
export class JobOfferEntity {
    @PrimaryColumn({ type: 'varchar' })
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

    @Column({ type: 'text' })
    description: string;

    @Column({ type: 'jsonb', default: [] })
    skillsRequired: string[];

    @Column({ type: 'jsonb', nullable: true })
    sourceMetadata: Record<string, unknown> | null;

    // Stored as jsonb for TypeORM compatibility; the repository handles
    // casting to pgvector format for similarity queries.
    @Column({ type: 'jsonb', nullable: true })
    vector: number[] | null;

    @Column()
    url: string;



    @Column({ type: 'timestamp', nullable: true })
    postedAt: Date | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    expiresAt: Date | null;

    @Column()
    source: string;

    @Column({ type: 'enum', enum: JobOfferStatus, default: JobOfferStatus.ACTIVE })
    status: JobOfferStatus;

    @Column('jsonb', { nullable: true })
    extraInfo: jsonSchemas.JobOfferEXtraInfo;

    @ManyToOne(() => UserEntity, (user: UserEntity) => user.jobOffers, { nullable: true })
    @JoinColumn()
    user: UserEntity;
}