import { randomUUID } from 'node:crypto'

import { Injectable } from '@nestjs/common'

import { PrismaService } from '@/app/database/prisma.service'

import type {
  VerificationToken,
  VerificationTokenRepository,
} from '@/modules/auth/application/ports/verification-token.repository.port'
import type { VerificationTokenDatabase } from '@workspace/database'

/**
 * Prisma VerificationToken Repository implementation
 *
 * Manages persistence of temporary verification tokens.
 * Adapts the better-auth verifications table.
 * Characteristic: only one valid token per identifier.
 */
@Injectable()
export class VerificationTokenRepositoryImpl implements VerificationTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    identifier: string
    value: string
    expiresAt: Date
  }): Promise<VerificationToken> {
    await this.deleteByIdentifier(data.identifier)

    const record = await this.prisma.verification.create({
      data: {
        id: randomUUID(),
        identifier: data.identifier.toLowerCase(),
        value: data.value,
        expiresAt: data.expiresAt,
      },
    })

    return this.toEntity(record)
  }

  async findByValue(value: string): Promise<VerificationToken | null> {
    const result = await this.prisma.verification.findFirst({ where: { value } })
    return result ? this.toEntity(result) : null
  }

  async findByIdentifier(identifier: string): Promise<VerificationToken | null> {
    const result = await this.prisma.verification.findFirst({
      where: { identifier: identifier.toLowerCase() },
    })
    return result ? this.toEntity(result) : null
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.prisma.verification.deleteMany({ where: { id } })
    return result.count > 0
  }

  async deleteByIdentifier(identifier: string): Promise<boolean> {
    const result = await this.prisma.verification.deleteMany({
      where: { identifier: identifier.toLowerCase() },
    })
    return result.count > 0
  }

  async deleteExpired(): Promise<number> {
    const result = await this.prisma.verification.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    })
    return result.count
  }

  async isValid(value: string): Promise<boolean> {
    const record = await this.findByValue(value)
    if (!record) {
      return false
    }
    return record.expiresAt > new Date()
  }

  private toEntity(record: VerificationTokenDatabase): VerificationToken {
    return {
      id: record.id,
      identifier: record.identifier,
      value: record.value,
      expiresAt: record.expiresAt,
      createdAt: record.createdAt,
    }
  }
}
