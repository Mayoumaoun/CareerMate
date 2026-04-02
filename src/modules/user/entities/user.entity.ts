import { CandidatureEntity } from "src/modules/career/candidature/candidature.entity";
import { JobOfferEntity } from "src/modules/career/job-offer/job-offer.entity";
import { LettreMotivationEntity } from "src/modules/career/lettre-motivation/lettre-motivation.entity";
import { RoadmapEntity } from "src/modules/career/roadmap/roadmap.entity";
import { Simulation } from "src/modules/career/simulation/entities/simulation.entity";
import { OpportunityEntity } from "src/modules/discovery/opportunity/opportunity.entity";
import { SavedArticleEntity } from "src/modules/discovery/saved-articles/saved-article.entity";
import { UserPreferencesEntity } from "src/modules/preferences/entities/user-preferences.entity";
import { PostEntity } from "src/modules/presence/post/post.entity";
import { ProfileEntity } from "src/modules/profile/entities/profile.entity";
import { Column, CreateDateColumn, DeleteDateColumn, Entity, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export enum Gender {
    Female = "Female",
    Male = "Male",
    Other = "Other",
}

@Entity("user")
export class UserEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    email: string;

    @Column()
    passwordHash: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn({nullable: true})
    deletedAt: Date | null;

    @Column()
    firstName: string;
    @Column()
    lastName: string;
    @Column()
    phone: string;
    @Column()
    country: string;
    @Column()
    city: string;
    @Column({type: 'date'})
    birthdate: Date;
    @Column({type: 'enum', enum: Gender})
    gender: Gender;

    @OneToMany(()=> LettreMotivationEntity, (lettreMotivation: LettreMotivationEntity)=> lettreMotivation.user )
    lettresMotivation: LettreMotivationEntity[];

    @OneToMany(() => OpportunityEntity, (opportunity: OpportunityEntity) => opportunity.user)
    opportunities: OpportunityEntity[];

    @OneToMany(() => JobOfferEntity, (jobOffer: JobOfferEntity) => jobOffer.user)
    jobOffers: JobOfferEntity[];

    @OneToMany(() => SavedArticleEntity, (savedArticle: SavedArticleEntity) => savedArticle.user)
    savedArticles: SavedArticleEntity[];

    @OneToOne(() => ProfileEntity, (profile: ProfileEntity) => profile.user)
    profile: ProfileEntity;

    @OneToMany(() => RoadmapEntity, (roadmap: RoadmapEntity) => roadmap.user)
    roadmaps: RoadmapEntity[];

    @OneToMany(() => CandidatureEntity, (candidature: CandidatureEntity) => candidature.user)
    candidatures: CandidatureEntity[];

    @OneToMany(() => Simulation, (simulation: Simulation) => simulation.user)
    simulations: Simulation[];

    @OneToMany(() => PostEntity, (post: PostEntity) => post.user)
    posts: PostEntity[];

    @OneToOne(() => UserPreferencesEntity, (userPreferences: UserPreferencesEntity) => userPreferences.user)
    preferences: UserPreferencesEntity;
}