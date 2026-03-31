import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Simulation } from "./simulation/entities/simulation.entity";
import { LettreMotivationEntity } from "./lettre-motivation/lettre-motivation.entity";
import { JobOfferEntity } from "./job-offer/job-offer.entity";
import { CandidatureEntity } from "./candidature/candidature.entity";
import { RoadmapEntity } from "./roadmap/roadmap.entity";
import { FeedbackSimulation } from "./simulation/entities/feedback-simulation.entity";
import { PitchEntity } from "./simulation/entities/pitch.entity";

@Module({
    imports: [TypeOrmModule.forFeature([CandidatureEntity, JobOfferEntity, LettreMotivationEntity, Simulation,RoadmapEntity,Simulation,FeedbackSimulation,PitchEntity])],
    providers: [],
    controllers: [],
    exports: []
})
export class CareerModule {}