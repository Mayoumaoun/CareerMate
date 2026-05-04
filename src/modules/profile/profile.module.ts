import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { CvEntity } from "../cv/cv.entity";
import { ProfileEntity } from "./entities/profile.entity";
import { ProjectEntity } from "./entities/projet.entity";
import { UserEntity } from "../user/entities/user.entity";
import { ProfileService } from "./profile.service";
import { ProfileController } from "./profile.controller";
import { ValidateAgeMinimumPipe } from "./pipes/validate-age-minimum.pipe";
import { ValidateDatesPipe } from "./pipes/validate-dates.pipe";
import { ValidateSkillsPipe } from "./pipes/validate-skills.pipe";

@Module({
    imports: [TypeOrmModule.forFeature([CvEntity, ProfileEntity, ProjectEntity, UserEntity]), AuthModule],
    providers: [ProfileService, ValidateAgeMinimumPipe, ValidateDatesPipe, ValidateSkillsPipe],
    controllers: [ProfileController],
    exports: [ProfileService]
})
export class ProfileModule {}