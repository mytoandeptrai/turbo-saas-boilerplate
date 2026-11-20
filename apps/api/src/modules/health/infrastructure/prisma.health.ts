import { Injectable } from '@nestjs/common'

import { PrismaService } from '@/app/database/prisma.service'

import type { HealthIndicatorResult } from '@nestjs/terminus'

/**
 * Prisma database health indicator
 *
 * Verifies the database connection by executing a simple SELECT 1 query
 */
@Injectable()
export class PrismaHealthIndicator {
  constructor(private readonly prisma: PrismaService) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`

      return {
        [key]: {
          status: 'up' as const,
          message: 'Database is available',
        },
      }
    } catch (error) {
      return {
        [key]: {
          status: 'down' as const,
          message: error instanceof Error ? error.message : 'Database check failed',
        },
      }
    }
  }
}
