import { randomUUID } from 'node:crypto'

import { Injectable } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { Prisma } from '@workspace/database';
import type { UserDatabase } from '@workspace/database';

import { PrismaService } from '@/app/database/prisma.service'

import type {
  CreateUserData,
  UpdateUserData,
  UserInfo,
  UserListQuery,
  UserListResult,
  IdentityRepository,
  UserSummary,
} from '@/modules/identity/application/ports/user.repository.port'

const BCRYPT_ROUNDS = 12

/**
 * Prisma User Management Repository implementation
 *
 * users: core user entity (identity + extended fields)
 * accounts: authentication credentials
 */
@Injectable()
export class UserRepositoryImpl implements IdentityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: UserListQuery): Promise<UserListResult> {
    const { page, pageSize, search, role, banned } = query

    const where: Prisma.UserWhereInput = {}

    if (banned !== undefined) {
      where.banned = banned
    }

    if (role) {
      where.role = role
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [usersData, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        take: pageSize,
        skip: (page - 1) * pageSize,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.user.count({ where }),
    ])

    return {
      data: usersData.map((user) => this.toUserInfo(user)),
      total,
    }
  }

  async findById(id: string): Promise<UserInfo | null> {
    const result = await this.prisma.user.findUnique({ where: { id } })
    return result ? this.toUserInfo(result) : null
  }

  async findByEmail(email: string): Promise<UserInfo | null> {
    const result = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase() },
    })
    return result ? this.toUserInfo(result) : null
  }

  async existsByEmail(email: string): Promise<boolean> {
    const result = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase() },
      select: { id: true },
    })
    return result !== null
  }

  async create(data: CreateUserData): Promise<UserInfo> {
    const userId = randomUUID()
    const accountId = randomUUID()
    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS)

    await this.prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          id: userId,
          name: data.name,
          email: data.email.toLowerCase(),
          username: data.email.split('@')[0] ?? data.email,
          displayUsername: data.name,
          displayName: data.displayName ?? null,
          role: data.role ?? 'USER',
          emailVerified: false,
          banned: false,
        },
      })

      await tx.account.create({
        data: {
          id: accountId,
          userId,
          providerId: 'email',
          accountId: data.email.toLowerCase(),
          password: passwordHash,
        },
      })
    })

    return (await this.findById(userId))!
  }

  async update(id: string, data: UpdateUserData): Promise<UserInfo | null> {
    const existing = await this.findById(id)
    if (!existing) {
      return null
    }

    const updates: Prisma.UserUpdateInput = {}

    if (data.name !== undefined) updates.name = data.name
    if (data.displayName !== undefined) updates.displayName = data.displayName
    if (data.banned !== undefined) updates.banned = data.banned
    if (data.banReason !== undefined) updates.banReason = data.banReason
    if (data.role !== undefined) updates.role = data.role

    const result = await this.prisma.user.update({
      where: { id },
      data: updates,
    })

    return this.toUserInfo(result)
  }

  async existsAndActive(id: string): Promise<boolean> {
    const result = await this.prisma.user.findFirst({
      where: { id, banned: false },
      select: { id: true },
    })
    return result !== null
  }

  async hardDelete(id: string): Promise<boolean> {
    const result = await this.prisma.user.deleteMany({ where: { id } })
    return result.count > 0
  }

  async getSummary(): Promise<UserSummary> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [total, active, adminCount, newToday] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { banned: false } }),
      this.prisma.user.count({ where: { role: 'ADMIN' } }),
      this.prisma.user.count({ where: { createdAt: { gte: today } } }),
    ])

    return { total, active, adminCount, newToday }
  }

  private toUserInfo(user: UserDatabase): UserInfo {
    return {
      id: user.id,
      name: user.name,
      displayName: user.displayName ?? null,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image ?? null,
      role: user.role,
      banned: user.banned ?? false,
      banReason: user.banReason,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }
}
