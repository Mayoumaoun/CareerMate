import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';
import { RedisService } from './redis.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const host = config.get('REDIS_HOST');
        const port = config.get('REDIS_PORT');
        const password = config.get('REDIS_PASSWORD');
        
        console.log('Connecting to Redis:', host, port); 
        
        return {
          stores: [
            createKeyv(`redis://:${password}@${host}:${port}`)
          ]
        };
      }
    })
  ],
  providers: [RedisService],
  exports: [RedisService]
})
export class RedisModule {}