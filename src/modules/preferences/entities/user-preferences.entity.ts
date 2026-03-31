import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import * as jsonSchemas from "src/common/types/json-schemas";
import { UserEntity } from "src/modules/user/entities/user.entity";

@Entity("user_preferences")
export class UserPreferencesEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;
    @OneToOne(() => UserEntity)
    @JoinColumn()
    user: UserEntity;

    @Column({ type: 'jsonb' })
    jobOffers: jsonSchemas.JobOffersPreferences;

    @Column({ type: 'jsonb' })
    simulation: jsonSchemas.SimulationPreferences;

    @Column({ type: 'jsonb' })
    lettreMotivation: jsonSchemas.LettreMotivationPreferences;

    @Column({ type: 'jsonb' })
    postsLinkedIn: jsonSchemas.PostsLinkedInPreferences;

    @Column({ type: 'jsonb' })
    roadmap: jsonSchemas.RoadmapPreferences;

    @Column({ type: 'jsonb' })
    opportunities: jsonSchemas.OpportunitiesPreferences;

    @Column({ type: 'jsonb' })
    tendances: jsonSchemas.TendancesPreferences;

}