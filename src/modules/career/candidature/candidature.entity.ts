import { CvEntity } from "src/modules/cv/cv.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { JobOfferEntity } from "../job-offer/job-offer.entity";
import { LettreMotivationEntity } from "../lettre-motivation/lettre-motivation.entity";
import { UserEntity } from "src/modules/user/entities/user.entity";

enum CandidatureStatus {}

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
    
    notes: string;

    @OneToOne(()=> CvEntity)
    @JoinColumn()
    cv: CvEntity;

    @OneToOne(()=> JobOfferEntity)
    @JoinColumn()
    relatedJobOffer: JobOfferEntity;

    @OneToOne(()=> LettreMotivationEntity, {nullable: true})
    @JoinColumn()
    relatedLettreMotivation: LettreMotivationEntity;

    @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
    user: UserEntity; 
}