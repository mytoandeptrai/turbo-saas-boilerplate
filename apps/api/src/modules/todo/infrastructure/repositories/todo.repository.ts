import { Injectable } from '@nestjs/common'

import { PrismaService } from '@/app/database/prisma.service'

import type { TodoRepository } from '@/modules/todo/application/ports/todo.repository.port'
import type { Todo, InsertTodo } from '@workspace/database'

/**
 * Todo Repository Prisma implementation
 */
@Injectable()
export class TodoRepositoryImpl implements TodoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Todo[]> {
    return this.prisma.todo.findMany()
  }

  async findById(id: string): Promise<Todo | null> {
    return this.prisma.todo.findUnique({ where: { id } })
  }

  async create(data: Omit<InsertTodo, 'id' | 'createdAt' | 'updatedAt'>): Promise<Todo> {
    return this.prisma.todo.create({ data })
  }

  async update(
    id: string,
    data: Partial<Omit<InsertTodo, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Todo | null> {
    try {
      return await this.prisma.todo.update({ where: { id }, data })
    } catch {
      return null
    }
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.prisma.todo.deleteMany({ where: { id } })
    return result.count > 0
  }
}
