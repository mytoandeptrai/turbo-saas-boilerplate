import { Global, Module } from '@nestjs/common'

import { PrismaService } from './prisma.service.js'

/**
 * Global Prisma database module
 *
 * Provides PrismaService to all feature modules.
 */
@Global() // @global-approved: database connection; all repositories depend on PrismaService
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
