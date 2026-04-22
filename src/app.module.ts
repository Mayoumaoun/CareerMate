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
import { JobMatchingModule } from './modules/career/job-offer/matching/job-matching.module';

const isProduction = process.env.NODE_ENV === 'production';

function getStringConfig(
  configService: ConfigService,
  key: string,
  fallback?: string,
): string {
  const value = configService.get<string>(key);

  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  if (!isProduction && fallback !== undefined) {
    return fallback;
  }

  throw new Error(`Missing required configuration value: ${key}`);
}

function getNumberConfig(
  configService: ConfigService,
  key: string,
  fallback?: number,
): number {
  const value = configService.get<string | number>(key);

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsedValue = Number(value);

    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }
  }

  if (!isProduction && fallback !== undefined) {
    return fallback;
  }

  throw new Error(`Missing required configuration value: ${key}`);
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: getStringConfig(configService, 'DB_HOST', 'localhost'),
        port: getNumberConfig(configService, 'DB_PORT', 5432),
        username: getStringConfig(configService, 'DB_USERNAME', 'postgres'),
        password: getStringConfig(configService, 'DB_PASSWORD', 'postgres'),
        database: getStringConfig(configService, 'DB_NAME', 'careermate'),
        autoLoadEntities: true,
        synchronize: !isProduction,
      })
    }),
    CareerModule, AuthModule, DiscoveryModule, JobMatchingModule, ProfileModule, PreferencesModule, PresenceModule, UserModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
