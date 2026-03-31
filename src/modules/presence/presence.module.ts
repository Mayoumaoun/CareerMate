import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PostEntity } from "./post/post.entity";

@Module({
    imports: [TypeOrmModule.forFeature([PostEntity])],
    providers: [],
    controllers: [],
    exports: []
})
export class PresenceModule {}