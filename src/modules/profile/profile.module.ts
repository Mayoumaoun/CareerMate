import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "../auth/auth.module";
import { CvEntity } from "./entities/cv.entity";
import { ProfileEntity } from "./entities/profile.entity";
import { ProjectEntity } from "./entities/projet.entity";
import { UserEntity } from "../user/entities/user.entity";
import { ProfileService } from "./profile.service";
import { ProfileController } from "./profile.controller";
import { CvParserService } from "./services/cv-parser.service";
import { ValidateAgeMinimumPipe } from "./pipes/validate-age-minimum.pipe";
import { ValidateDatesPipe } from "./pipes/validate-dates.pipe";
import { ValidateSkillsPipe } from "./pipes/validate-skills.pipe";

@Module({
    imports: [TypeOrmModule.forFeature([CvEntity, ProfileEntity, ProjectEntity, UserEntity]), AuthModule, ConfigModule],
    providers: [ProfileService, CvParserService, ValidateAgeMinimumPipe, ValidateDatesPipe, ValidateSkillsPipe],
    controllers: [ProfileController],
    exports: [ProfileService]
})
export class ProfileModule {}