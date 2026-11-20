import { Injectable } from '@nestjs/common'

import { PrismaService } from '@/app/database/prisma.service'

import type {
  User,
  UserRepository,
  CreateUserData,
} from '@/modules/auth/application/ports/user.repository.port'
import type { UserDatabase } from '@workspace/database'

/**
 * Prisma User Repository implementation
 *
 * Manages persistence of core user data.
 * Adapts to the better-auth schema.
 */
@Injectable()
export class UserRepositoryImpl implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserData): Promise<User> {
    const record = await this.prisma.user.create({
      data: {
        id: data.id,
        name: data.name,
        email: data.email,
        username: data.email.split('@')[0] ?? data.email,
        displayUsername: data.name,
        role: data.role ?? 'USER',
        emailVerified: false,
        banned: false,
      },
    })

    return this.toEntity(record)
  }

  async findById(id: string): Promise<User | null> {
    const result = await this.prisma.user.findUnique({ where: { id } })
    return result ? this.toEntity(result) : null
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    })
    return result !== null
  }

  async existsAndActive(id: string): Promise<boolean> {
    const result = await this.prisma.user.findFirst({
      where: { id, banned: false },
      select: { id: true },
    })
    return result !== null
  }

  private toEntity(record: UserDatabase): User {
    return {
      id: record.id,
      name: record.name,
      email: record.email,
      emailVerified: record.emailVerified,
      image: record.image,
      role: record.role,
      banned: record.banned ?? false,
      banReason: record.banReason,
      banExpires: record.banExpires,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }
  }
}
