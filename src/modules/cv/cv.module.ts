import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HttpModule } from "@nestjs/axios";
import { MulterModule } from "@nestjs/platform-express";
import { CvEntity } from "./cv.entity";
import { CvController } from "./cv.controller";
import { CvService } from "./cv.service";
import { ProfileEntity } from "../profile/entities/profile.entity";

@Module({
    imports: [
        TypeOrmModule.forFeature([CvEntity, ProfileEntity]),
        HttpModule,
        MulterModule.register({
            limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
        })

    ],
    providers: [CvService],
    controllers: [CvController],
    exports: [CvService]
})
export class CvModule {}
