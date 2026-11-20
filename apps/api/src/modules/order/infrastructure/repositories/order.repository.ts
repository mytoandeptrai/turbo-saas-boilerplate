import { Injectable, PreconditionFailedException } from '@nestjs/common'
import { Prisma } from '@workspace/database'

import { PrismaService } from '@/app/database/prisma.service'
import { Order } from '@/modules/order/domain/aggregates/order.aggregate'
import { OrderStatus } from '@/modules/order/domain/enums/order-status.enum'
import { Money } from '@/modules/order/domain/value-objects/money.vo'
import { OrderItem } from '@/modules/order/domain/value-objects/order-item.vo'
import { ErrorCode } from '@/shared-kernel/infrastructure/enums/error-code'

import type { OrderRepository } from '@/modules/order/application/ports/order.repository.port'
import type { OrderDatabase } from '@workspace/database'

/**
 * Order Repository Prisma implementation
 *
 * saveWithVersion uses optimistic locking: UPDATE ... WHERE id = ? AND version = ?
 * If 0 rows are updated, the version has been modified by another request; throws 412.
 */
@Injectable()
export class OrderRepositoryImpl implements OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Order | null> {
    const row = await this.prisma.order.findUnique({ where: { id } })
    return row ? this.toDomain(row) : null
  }

  async save(order: Order): Promise<void> {
    const data = this.toPersistence(order)
    await this.prisma.order.upsert({
      where: { id: order.id },
      create: data,
      update: {
        status: data.status,
        version: data.version,
        updatedAt: data.updatedAt,
      },
    })
  }

  async saveWithVersion(order: Order, expectedVersion: number): Promise<void> {
    const data = this.toPersistence(order)

    const result = await this.prisma.order.updateMany({
      where: { id: order.id, version: expectedVersion },
      data: {
        status: data.status,
        version: data.version,
        updatedAt: data.updatedAt,
      },
    })

    if (result.count === 0) {
      throw new PreconditionFailedException({
        code: ErrorCode.ORDER_VERSION_CONFLICT,
        message: `Order ${order.id} has a version conflict; the current version is stale, please fetch the latest order data`,
      })
    }
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.prisma.order.deleteMany({ where: { id } })
    return result.count > 0
  }

  private toDomain(row: OrderDatabase): Order {
    const items = (row.items as { productId: string; quantity: number; unitPrice: string }[]).map(
      (item) => OrderItem.create(item.productId, item.quantity, item.unitPrice),
    )

    return Order.reconstitute(
      row.id,
      row.userId,
      row.status as OrderStatus,
      items,
      Money.create(row.totalAmount.toString(), row.currency),
      row.version,
      row.createdAt,
      row.updatedAt,
    )
  }

  private toPersistence(order: Order): Prisma.OrderUncheckedCreateInput {
    return {
      id: order.id,
      userId: order.userId,
      status: order.status,
      items: order.items.map((item) => item.toPlain()),
      totalAmount: order.totalAmount.amount,
      currency: order.totalAmount.currency,
      version: order.version,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }
  }
}

export { ORDER_REPOSITORY } from '@/modules/order/application/ports/order.repository.port'
