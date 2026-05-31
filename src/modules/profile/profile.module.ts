import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "../auth/auth.module";
import { CvEntity } from "../cv/cv.entity";
import { ProfileEntity } from "./entities/profile.entity";
import { ProjectEntity } from "./entities/projet.entity";
import { UserEntity } from "../user/entities/user.entity";
import { UserPreferencesEntity } from "../preferences/entities/user-preferences.entity";
import { ProfileService } from "./profile.service";
import { ProfileController } from "./profile.controller";
import { CvParserService } from "./services/cv-parser.service";
import { ValidateAgeMinimumPipe } from "./pipes/validate-age-minimum.pipe";
import { ValidateDatesPipe } from "./pipes/validate-dates.pipe";
import { ValidateSkillsPipe } from "./pipes/validate-skills.pipe";
import { CvModule } from "../cv/cv.module";
import { ProjectsController } from "./projects.controller";
import { ProjectsService } from "./projects.service";

@Module({
    imports: [TypeOrmModule.forFeature([CvEntity, ProfileEntity, ProjectEntity, UserEntity, UserPreferencesEntity]), forwardRef(() => AuthModule), ConfigModule, CvModule],
    providers: [ProfileService, CvParserService, ProjectsService, ValidateAgeMinimumPipe, ValidateDatesPipe, ValidateSkillsPipe],
    controllers: [ProfileController,ProjectsController],
    exports: [ProfileService]
})
export class ProfileModule {}