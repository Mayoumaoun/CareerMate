import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CvEntity } from "./entities/cv.entity";
import { ProfileEntity } from "./entities/profile.entity";
import { ProjectEntity } from "./entities/projet.entity";

@Module({
    imports: [TypeOrmModule.forFeature([CvEntity,ProfileEntity,ProjectEntity])],
    providers: [],
    controllers: [],
    exports: []
})
export class ProfileModule {}