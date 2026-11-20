import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'

import { PrismaHealthIndicator } from '@/modules/health/infrastructure/prisma.health'
import { RedisHealthIndicator } from '@/modules/health/infrastructure/redis.health'
import { HealthController } from '@/modules/health/presentation/controllers/health.controller'

/**
 * Health check module
 *
 * Provides application health check functionality including database, Redis, memory, and disk checks.
 * Note: DB and Cache are provided by global modules (PrismaModule, CacheModule).
 */
@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [
    PrismaHealthIndicator, // database health indicator
    RedisHealthIndicator, // Redis health indicator
  ],
})
export class HealthModule {}
