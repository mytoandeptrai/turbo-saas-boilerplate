import { Injectable } from '@nestjs/common'
import { Prisma } from '@workspace/database'

import { PrismaService } from '@/app/database/prisma.service'

import type {
  AuditLogData,
  AuditLogListQuery,
  AuditLogListResult,
  AuditLogRecord,
  AuditLogRepository,
} from '@/modules/audit-log/application/ports/audit-log.repository.port'

@Injectable()
export class AuditLogRepositoryImpl implements AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: AuditLogData): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        action: data.action,
        actorId: data.actorId ?? null,
        actorEmail: data.actorEmail ?? null,
        actorName: data.actorName ?? null,
        resourceType: data.resourceType ?? null,
        resourceId: data.resourceId ?? null,
        before:
          data.before === undefined || data.before === null
            ? Prisma.JsonNull
            : (data.before as Prisma.InputJsonValue),
        after:
          data.after === undefined || data.after === null
            ? Prisma.JsonNull
            : (data.after as Prisma.InputJsonValue),
        detail:
          data.detail === undefined || data.detail === null
            ? Prisma.JsonNull
            : (data.detail as Prisma.InputJsonValue),
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        requestId: data.requestId ?? null,
        occurredAt: data.occurredAt ?? null,
      },
    })
  }

  async findAll(query: AuditLogListQuery): Promise<AuditLogListResult> {
    const { page, pageSize, actorId, action } = query

    const where: Prisma.AuditLogWhereInput = {}
    if (actorId) where.actorId = actorId
    if (action) where.action = action

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ])

    const data: AuditLogRecord[] = rows.map((row) => ({
      id: row.id,
      action: row.action,
      actorId: row.actorId,
      actorEmail: row.actorEmail,
      actorName: row.actorName,
      resourceType: row.resourceType,
      resourceId: row.resourceId,
      before: row.before,
      after: row.after,
      detail: row.detail,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      requestId: row.requestId,
      occurredAt: row.occurredAt,
      createdAt: row.createdAt,
    }))

    return { data, total }
  }
}
