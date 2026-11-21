import { randomUUID } from 'node:crypto'

import { Injectable } from '@nestjs/common'
import { Prisma } from '@workspace/database';
import type { LoginStatus } from '@workspace/database';

import { PrismaService } from '@/app/database/prisma.service'

import type {
  LoginLogEntry,
  LoginLogRecord,
  LoginLogQueryParams,
  LoginLogRepository,
} from '@/modules/auth/application/ports/login-log.repository.port'

@Injectable()
export class LoginLogRepositoryImpl implements LoginLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(entry: LoginLogEntry): Promise<void> {
    await this.prisma.loginLog.create({
      data: {
        id: randomUUID(),
        userId: entry.userId ?? null,
        email: entry.email,
        status: entry.status as LoginStatus,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
        failReason: entry.failReason ?? null,
      },
    })
  }

  async findAll(params: LoginLogQueryParams): Promise<{ data: LoginLogRecord[]; total: number }> {
    const { page, pageSize, email, status } = params
    const offset = (page - 1) * pageSize

    const where: Prisma.LoginLogWhereInput = {}
    if (email) {
      where.email = { contains: email, mode: 'insensitive' }
    }
    if (status) {
      where.status = status as LoginStatus
    }

    const [rows, total] = await Promise.all([
      this.prisma.loginLog.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        take: pageSize,
        skip: offset,
      }),
      this.prisma.loginLog.count({ where }),
    ])

    return {
      data: rows as LoginLogRecord[],
      total,
    }
  }
}
