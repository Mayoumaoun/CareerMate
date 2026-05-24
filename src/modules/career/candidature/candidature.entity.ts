import { CvEntity } from "src/modules/cv/cv.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { JobOfferEntity } from "../job-offer/job-offer.entity";
import { LettreMotivationEntity } from "../lettre-motivation/lettre-motivation.entity";
import { UserEntity } from "src/modules/user/entities/user.entity";

export enum CandidatureStatus {
    DRAFT = 'DRAFT',
    SENT = 'SENT',
    INTERVIEW = 'INTERVIEW',
    REJECTED = 'REJECTED',
    ACCEPTED = 'ACCEPTED',
}

@Entity("candidature")
export class CandidatureEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({type: 'enum', enum: CandidatureStatus})
    status: CandidatureStatus;

    @Column({type: 'timestamp'})
    appliedAt: Date;

    @Column({type: 'timestamp'}) 
    updatedAt: Date;
    
    @Column({type: 'timestamp', nullable: true})
    deletedAt: Date | null;
    
    @Column({ type: 'text', default: '' })
    notes: string;

    @OneToOne(()=> CvEntity, { nullable: true })
    @JoinColumn()
    cv: CvEntity | null;

    @OneToOne(()=> JobOfferEntity)
    @JoinColumn()
    relatedJobOffer: JobOfferEntity;

    @OneToOne(()=> LettreMotivationEntity, {nullable: true})
    @JoinColumn()
    relatedLettreMotivation: LettreMotivationEntity;

    @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
    user: UserEntity; 
}