import { Injectable } from '@nestjs/common'

import { PrismaService } from '@/app/database/prisma.service'
import { AuthIdentity } from '@/modules/auth/domain/aggregates/auth-identity.aggregate'

import type { AuthIdentityRepository } from '@/modules/auth/application/ports/auth-identity.repository.port'
import type { AuthProvider } from '@/modules/auth/domain/value-objects/auth-provider'
import type { AccountDatabase } from '@workspace/database'

/**
 * Prisma AuthIdentity Repository implementation
 *
 * Manages persistence of multi-provider auth identities.
 * Adapts the better-auth accounts table.
 */
@Injectable()
export class AuthIdentityRepositoryImpl implements AuthIdentityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(identity: AuthIdentity): Promise<void> {
    const data = {
      id: identity.id,
      userId: identity.userId,
      providerId: identity.providerId,
      accountId: identity.accountId,
      password: identity.password,
      accessToken: identity.accessToken,
      refreshToken: identity.refreshToken,
      accessTokenExpiresAt: identity.accessTokenExpiresAt,
      refreshTokenExpiresAt: identity.refreshTokenExpiresAt,
      scope: identity.scope,
      updatedAt: identity.updatedAt,
    }

    const existing = await this.findById(identity.id)

    if (existing) {
      await this.prisma.account.update({ where: { id: identity.id }, data })
      return
    }

    await this.prisma.account.create({
      data: {
        ...data,
        createdAt: identity.createdAt,
      },
    })
  }

  async findById(id: string): Promise<AuthIdentity | null> {
    const result = await this.prisma.account.findUnique({ where: { id } })
    return result ? this.toDomain(result) : null
  }

  async findByUserId(userId: string): Promise<AuthIdentity[]> {
    const results = await this.prisma.account.findMany({ where: { userId } })
    return results.map((record) => this.toDomain(record))
  }

  async findByUserIdAndProvider(
    userId: string,
    provider: AuthProvider,
  ): Promise<AuthIdentity | null> {
    const result = await this.prisma.account.findFirst({
      where: { userId, providerId: provider },
    })
    return result ? this.toDomain(result) : null
  }

  async findByProviderAndIdentifier(
    provider: AuthProvider,
    accountId: string,
  ): Promise<AuthIdentity | null> {
    const result = await this.prisma.account.findUnique({
      where: {
        providerId_accountId: {
          providerId: provider,
          accountId: accountId.toLowerCase(),
        },
      },
    })
    return result ? this.toDomain(result) : null
  }

  async findByIdentifier(accountId: string): Promise<AuthIdentity | null> {
    const result = await this.prisma.account.findFirst({
      where: { accountId: accountId.toLowerCase() },
    })
    return result ? this.toDomain(result) : null
  }

  async existsByIdentifier(accountId: string): Promise<boolean> {
    const result = await this.prisma.account.findFirst({
      where: { accountId: accountId.toLowerCase() },
      select: { id: true },
    })
    return result !== null
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.prisma.account.deleteMany({ where: { id } })
    return result.count > 0
  }

  async deleteByUserId(userId: string): Promise<number> {
    const result = await this.prisma.account.deleteMany({ where: { userId } })
    return result.count
  }

  private toDomain(record: AccountDatabase): AuthIdentity {
    return AuthIdentity.reconstitute(
      record.id,
      record.userId,
      record.providerId as AuthProvider,
      record.accountId,
      record.password,
      record.accessToken,
      record.refreshToken,
      record.accessTokenExpiresAt,
      record.refreshTokenExpiresAt,
      record.scope,
      record.createdAt,
      record.updatedAt,
    )
  }
}
