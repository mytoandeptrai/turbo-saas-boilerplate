import { PrismaClient } from '@prisma/client'

export type CreatePrismaClientOptions = {
  datasourceUrl?: string
  log?: Array<'query' | 'info' | 'warn' | 'error'>
}

/**
 * Creates a PrismaClient instance.
 *
 * Prefer injecting PrismaService in NestJS; use this for scripts (seed, etc.).
 */
export function createPrismaClient(options: CreatePrismaClientOptions = {}): PrismaClient {
  return new PrismaClient({
    datasourceUrl: options.datasourceUrl,
    log: options.log,
  })
}
