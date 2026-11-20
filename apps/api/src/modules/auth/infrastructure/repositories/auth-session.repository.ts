import { Injectable } from '@nestjs/common'

import { PrismaService } from '@/app/database/prisma.service'
import { AuthSession } from '@/modules/auth/domain/entities/auth-session.entity'

import type { AuthSessionRepository } from '@/modules/auth/application/ports/auth-session.repository.port'
import type { SessionDatabase } from '@workspace/database'

/**
 * Prisma AuthSession Repository implementation
 *
 * Manages persistence of user sessions (refresh tokens).
 * Adapts the better-auth schema.
 */
@Injectable()
export class AuthSessionRepositoryImpl implements AuthSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(session: AuthSession): Promise<void> {
    const existing = await this.findById(session.id)

    if (existing) {
      await this.prisma.session.update({
        where: { id: session.id },
        data: { expiresAt: session.expiresAt },
      })
      return
    }

    await this.prisma.session.create({
      data: {
        id: session.id,
        userId: session.userId,
        token: session.token,
        expiresAt: session.expiresAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        createdAt: session.createdAt,
      },
    })
  }

  async findById(id: string): Promise<AuthSession | null> {
    const result = await this.prisma.session.findUnique({ where: { id } })
    return result ? this.toDomain(result) : null
  }

  async findByToken(token: string): Promise<AuthSession | null> {
    const result = await this.prisma.session.findUnique({ where: { token } })
    return result ? this.toDomain(result) : null
  }

  async findActiveByUserId(userId: string): Promise<AuthSession[]> {
    const now = new Date()
    const results = await this.prisma.session.findMany({
      where: { userId, expiresAt: { gt: now } },
    })
    return results.map((record) => this.toDomain(record))
  }

  async findAllByUserId(userId: string): Promise<AuthSession[]> {
    const results = await this.prisma.session.findMany({ where: { userId } })
    return results.map((record) => this.toDomain(record))
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.prisma.session.deleteMany({ where: { id } })
    return result.count > 0
  }

  async deleteAllByUserId(userId: string): Promise<number> {
    const result = await this.prisma.session.deleteMany({ where: { userId } })
    return result.count
  }

  async deleteExpired(): Promise<number> {
    const result = await this.prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    })
    return result.count
  }

  private toDomain(record: SessionDatabase): AuthSession {
    return AuthSession.reconstitute(
      record.id,
      record.userId,
      record.token,
      record.expiresAt,
      record.ipAddress ?? null,
      record.userAgent ?? null,
      record.createdAt,
    )
  }
}
