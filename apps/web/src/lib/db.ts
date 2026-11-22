import 'server-only'
import { createPrismaClient } from '@workspace/database'

import { env } from '@/config/env'

import type { PrismaClient } from '@workspace/database'

const globalForPrisma = globalThis as { prisma?: PrismaClient }

/** Single Prisma client per server process (survives dev hot reloads). */
export const db = (globalForPrisma.prisma ??= createPrismaClient({
  datasourceUrl: env.DATABASE_URL,
}))
