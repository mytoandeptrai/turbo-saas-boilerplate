import { Injectable } from '@nestjs/common'

import { PrismaService } from '@/app/database/prisma.service'

import type { UserRoleRepository } from '@/modules/auth/application/ports/user-role.repository.port'
import type { RoleType } from '@/shared-kernel/domain/value-objects/role.vo'

/**
 * Prisma UserRole Repository implementation
 *
 * Single-role management (adapts better-auth users.role field)
 */
@Injectable()
export class UserRoleRepositoryImpl implements UserRoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async setRole(userId: string, role: RoleType): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { role },
    })
  }

  async getRole(userId: string): Promise<RoleType | null> {
    const result = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    return result?.role ?? null
  }

  async hasRole(userId: string, role: RoleType): Promise<boolean> {
    const userRole = await this.getRole(userId)
    return userRole === role
  }

  async getUserIdsByRole(role: RoleType): Promise<string[]> {
    const results = await this.prisma.user.findMany({
      where: { role },
      select: { id: true },
    })

    return results.map((r) => r.id)
  }
}
