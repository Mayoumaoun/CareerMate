import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CvEntity } from "./cv.entity";
import { CvController } from "./cv.controller";
import { CvService } from "./cv.service";

@Module({
    imports: [TypeOrmModule.forFeature([CvEntity])],
    providers: [CvService],
    controllers: [CvController],
    exports: [CvService]
})
export class CvModule {}