import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserPreferencesEntity } from "./entities/user-preferences.entity";

@Module({
    imports: [TypeOrmModule.forFeature([UserPreferencesEntity])],
    providers: [],
    controllers: [],
    exports: []
})
export class PreferencesModule {}