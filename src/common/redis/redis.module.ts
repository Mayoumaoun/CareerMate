import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';
import { RedisService } from './redis.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Socket } from 'node:net';

async function canReachPort(host: string, port: number, timeoutMs = 750): Promise<boolean> {
  return await new Promise((resolve) => {
    const socket = new Socket();

    const finish = (result: boolean) => {
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const rawHost = config.get<string>('REDIS_HOST');
        const rawPort = config.get<string | number>('REDIS_PORT');
        const rawPassword = config.get<string>('REDIS_PASSWORD');

        // If Redis isn't configured, fall back to in-memory cache so the API can boot.
        if (!rawHost || String(rawHost).trim().length === 0) {
          return {};
        }

        const host = String(rawHost).trim();
        const port = typeof rawPort === 'number' ? rawPort : Number(rawPort ?? 6379);
        const password = rawPassword && String(rawPassword).trim().length > 0 ? String(rawPassword) : undefined;
        const resolvedPort = Number.isFinite(port) ? port : 6379;

        // Keep local development bootable when Redis is configured but not running.
        if (!(await canReachPort(host, resolvedPort))) {
          return {};
        }

        const url = new URL(`redis://${host}:${resolvedPort}`);
        if (password) {
          url.password = password;
          url.username = '';
        }

        return {
          stores: [createKeyv(url.toString())],
        };
      }
    })
  ],
  providers: [RedisService],
  exports: [RedisService]
})
export class RedisModule {}
