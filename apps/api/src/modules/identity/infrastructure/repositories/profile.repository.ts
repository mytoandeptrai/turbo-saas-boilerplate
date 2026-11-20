import { Injectable } from '@nestjs/common'

import { PrismaService } from '@/app/database/prisma.service'

import type {
  ProfileData,
  ProfileRepository,
  UpdateProfileData,
} from '@/modules/identity/application/ports/profile.repository.port'
import type { UserDatabase } from '@workspace/database'

@Injectable()
export class ProfileRepositoryImpl implements ProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<ProfileData | null> {
    const result = await this.prisma.user.findUnique({ where: { id } })
    return result ? this.toProfileData(result) : null
  }

  async update(id: string, data: UpdateProfileData): Promise<ProfileData | null> {
    const updates: {
      displayName?: string | null
      bio?: string | null
      image?: string | null
    } = {}

    if (data.displayName !== undefined) updates.displayName = data.displayName
    if (data.bio !== undefined) updates.bio = data.bio
    if (data.avatarUrl !== undefined) updates.image = data.avatarUrl

    try {
      const result = await this.prisma.user.update({
        where: { id },
        data: updates,
      })
      return this.toProfileData(result)
    } catch {
      return null
    }
  }

  private toProfileData(user: UserDatabase): ProfileData {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      displayName: user.displayName ?? null,
      bio: user.bio ?? null,
      avatarUrl: user.image ?? null,
    }
  }
}
