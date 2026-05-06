import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CareerModule } from './modules/career/career.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProfileModule } from './modules/profile/profile.module';
import { PreferencesModule } from './modules/preferences/preferences.module';
import { PresenceModule } from './modules/presence/presence.module';
import { UserModule } from './modules/user/user.module';
import { DiscoveryModule } from './modules/discovery/discovery.module';
import { RedisModule } from './common/redis/redis.module';
import { RoadmapModule } from './modules/career/roadmap/roadmap.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV}`,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: process.env.NODE_ENV === 'development',
      })
    }),
    CareerModule, AuthModule, DiscoveryModule, ProfileModule, PreferencesModule, PresenceModule, UserModule, RedisModule, RoadmapModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
