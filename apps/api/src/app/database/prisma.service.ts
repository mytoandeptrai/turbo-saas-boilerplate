import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaClient } from '@workspace/database'

import type { Env } from '@/app/config/env.schema'
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common'

/**
 * NestJS Prisma service
 *
 * Extends PrismaClient and manages connect/disconnect lifecycle.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(configService: ConfigService<Env, true>) {
    super({
      datasourceUrl: configService.get('DATABASE_URL', { infer: true }),
    })
  }

  async onModuleInit() {
    await this.$connect()
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
