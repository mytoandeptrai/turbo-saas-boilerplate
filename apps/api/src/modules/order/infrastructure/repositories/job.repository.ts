import { Injectable } from '@nestjs/common'
import { Prisma } from '@workspace/database'

import { PrismaService } from '@/app/database/prisma.service'

import type {
  Job,
  JobRepository,
  JobStatus,
} from '@/modules/order/application/ports/job.repository.port'
import type { JobDatabase } from '@workspace/database'

/**
 * Job Repository Prisma implementation
 */
@Injectable()
export class JobRepositoryImpl implements JobRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Job | null> {
    const row = await this.prisma.backgroundJob.findUnique({ where: { id } })
    return row ? this.toDomain(row) : null
  }

  async create(job: Omit<Job, 'createdAt' | 'updatedAt'>): Promise<Job> {
    const row = await this.prisma.backgroundJob.create({
      data: {
        id: job.id,
        type: job.type,
        status: job.status,
        payload: job.payload as Prisma.InputJsonValue,
        result: (job.result as Prisma.InputJsonValue | null) ?? Prisma.JsonNull,
        error: (job.error as Prisma.InputJsonValue | null) ?? Prisma.JsonNull,
      },
    })

    return this.toDomain(row)
  }

  async updateStatus(
    id: string,
    status: JobStatus,
    result?: unknown,
    error?: { code: string; message: string },
  ): Promise<void> {
    await this.prisma.backgroundJob.update({
      where: { id },
      data: {
        status,
        result: (result as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
        error: (error as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
      },
    })
  }

  private toDomain(row: JobDatabase): Job {
    return {
      id: row.id,
      type: row.type,
      status: row.status as JobStatus,
      payload: row.payload as Record<string, unknown>,
      result: row.result ?? null,
      error: row.error as { code: string; message: string } | null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }
}
