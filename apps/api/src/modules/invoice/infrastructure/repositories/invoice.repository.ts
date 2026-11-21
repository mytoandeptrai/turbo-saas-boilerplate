import { Injectable } from '@nestjs/common'
import { Prisma } from '@workspace/database'

import { PrismaService } from '@/app/database/prisma.service'

import type {
  CreateInvoiceInput,
  InvoiceFilter,
  InvoiceRepository,
  InvoiceStats,
} from '@/modules/invoice/application/ports/invoice.repository.port'
import type {
  InvoiceItemRecord,
  InvoiceRecord,
  InvoiceWithItems,
  ValidationIssue,
} from '@/modules/invoice/domain/invoice.types'
import type { Invoice, InvoiceItem } from '@workspace/database'

const money = (value: Prisma.Decimal | null): string => (value ?? new Prisma.Decimal(0)).toFixed(2)
const toDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00.000Z`)

function toRecord(row: Invoice): InvoiceRecord {
  return {
    id: row.id,
    ownerId: row.ownerId,
    provider: row.provider,
    status: row.status,
    invoiceTemplate: row.invoiceTemplate,
    invoiceSeries: row.invoiceSeries,
    invoiceNumber: row.invoiceNumber,
    issuedAt: row.issuedAt,
    currency: row.currency,
    exchangeRate: row.exchangeRate.toString(),
    sellerTaxCode: row.sellerTaxCode,
    sellerName: row.sellerName,
    sellerAddress: row.sellerAddress,
    buyerTaxCode: row.buyerTaxCode,
    buyerName: row.buyerName,
    buyerAddress: row.buyerAddress,
    subtotalAmount: money(row.subtotalAmount),
    vatAmount: money(row.vatAmount),
    totalAmount: money(row.totalAmount),
    validationIssues: row.validationIssues as unknown as ValidationIssue[],
    sourceFileName: row.sourceFileName,
    createdAt: row.createdAt,
  }
}

function toItemRecord(row: InvoiceItem): InvoiceItemRecord {
  return {
    id: row.id,
    kind: row.kind,
    lineNumber: row.lineNumber,
    code: row.code,
    name: row.name,
    unit: row.unit,
    quantity: row.quantity?.toString() ?? null,
    unitPrice: row.unitPrice?.toString() ?? null,
    discountAmount: money(row.discountAmount),
    amount: money(row.amount),
    vatRate: row.vatRate,
    vatAmount: row.vatAmount === null ? null : money(row.vatAmount),
  }
}

function toRecordWithItems(row: Invoice & { items: InvoiceItem[] }): InvoiceWithItems {
  return { ...toRecord(row), items: row.items.map((item) => toItemRecord(item)) }
}

function buildWhere(ownerId: string, filter: InvoiceFilter): Prisma.InvoiceWhereInput {
  const q = filter.q?.trim()
  return {
    ownerId,
    status: filter.status,
    provider: filter.provider,
    ...((filter.issuedFrom || filter.issuedTo) && {
      issuedAt: {
        gte: filter.issuedFrom ? toDate(filter.issuedFrom) : undefined,
        lte: filter.issuedTo ? toDate(filter.issuedTo) : undefined,
      },
    }),
    ...(q && {
      OR: [
        { invoiceNumber: { contains: q } },
        { sellerTaxCode: { contains: q } },
        { sellerName: { contains: q, mode: 'insensitive' } },
      ],
    }),
  }
}

const ORDER_BY: Prisma.InvoiceOrderByWithRelationInput[] = [
  { issuedAt: 'desc' },
  { createdAt: 'desc' },
  { id: 'asc' },
]

@Injectable()
export class InvoiceRepositoryImpl implements InvoiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateInvoiceInput): Promise<InvoiceRecord | null> {
    const { invoice } = input
    try {
      const row = await this.prisma.invoice.create({
        data: {
          ownerId: input.ownerId,
          provider: invoice.provider,
          status: input.status,
          invoiceTemplate: invoice.invoiceTemplate,
          invoiceSeries: invoice.invoiceSeries,
          invoiceNumber: invoice.invoiceNumber,
          issuedAt: toDate(invoice.issuedAt),
          currency: invoice.currency,
          exchangeRate: invoice.exchangeRate,
          sellerTaxCode: invoice.sellerTaxCode,
          sellerName: invoice.sellerName,
          sellerAddress: invoice.sellerAddress,
          buyerTaxCode: invoice.buyerTaxCode,
          buyerName: invoice.buyerName,
          buyerAddress: invoice.buyerAddress,
          subtotalAmount: invoice.subtotalAmount,
          vatAmount: invoice.vatAmount,
          totalAmount: invoice.totalAmount,
          validationIssues: input.validationIssues as unknown as Prisma.InputJsonValue,
          sourceFileName: input.sourceFileName.slice(0, 255),
          sourceFileHash: input.sourceFileHash,
          items: {
            create: invoice.items.map((item) => ({
              kind: item.kind,
              lineNumber: item.lineNumber,
              code: item.code,
              name: item.name,
              unit: item.unit,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discountAmount: item.discountAmount,
              amount: item.amount,
              vatRate: item.vatRate,
              vatAmount: item.vatAmount,
            })),
          },
        },
      })
      return toRecord(row)
    } catch (error) {
      // The unique index is the source of truth for duplicates (race-safe)
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return null
      }
      throw error
    }
  }

  async findPage(
    ownerId: string,
    filter: InvoiceFilter,
    page: number,
    pageSize: number,
  ): Promise<{ data: InvoiceRecord[]; total: number }> {
    const where = buildWhere(ownerId, filter)
    const [rows, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        orderBy: ORDER_BY,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.invoice.count({ where }),
    ])
    return { data: rows.map((row) => toRecord(row)), total }
  }

  async findByIdWithItems(ownerId: string, id: string): Promise<InvoiceWithItems | null> {
    const row = await this.prisma.invoice.findFirst({
      where: { id, ownerId },
      include: { items: { orderBy: { lineNumber: 'asc' } } },
    })
    return row ? toRecordWithItems(row) : null
  }

  async count(ownerId: string, filter: InvoiceFilter): Promise<number> {
    return this.prisma.invoice.count({ where: buildWhere(ownerId, filter) })
  }

  async findAllWithItems(
    ownerId: string,
    filter: InvoiceFilter,
    limit: number,
  ): Promise<InvoiceWithItems[]> {
    const rows = await this.prisma.invoice.findMany({
      where: buildWhere(ownerId, filter),
      orderBy: ORDER_BY,
      take: limit,
      include: { items: { orderBy: { lineNumber: 'asc' } } },
    })
    return rows.map((row) => toRecordWithItems(row))
  }

  async getStats(ownerId: string, filter: InvoiceFilter): Promise<InvoiceStats> {
    const where = buildWhere(ownerId, filter)
    // Amounts are reported in VND: each invoice is converted with its own exchange rate
    const [groups, mismatchCount] = await Promise.all([
      this.prisma.invoice.groupBy({
        by: ['exchangeRate'],
        where,
        _count: true,
        _sum: { subtotalAmount: true, vatAmount: true, totalAmount: true },
      }),
      filter.status === 'VALID'
        ? 0
        : this.prisma.invoice.count({ where: { ...where, status: 'MISMATCH' } }),
    ])

    const zero = new Prisma.Decimal(0)
    let totalInvoices = 0
    let subtotal = zero
    let vat = zero
    let total = zero
    for (const group of groups) {
      totalInvoices += group._count
      subtotal = subtotal.plus((group._sum.subtotalAmount ?? zero).times(group.exchangeRate))
      vat = vat.plus((group._sum.vatAmount ?? zero).times(group.exchangeRate))
      total = total.plus((group._sum.totalAmount ?? zero).times(group.exchangeRate))
    }

    return {
      totalInvoices,
      validCount: totalInvoices - mismatchCount,
      mismatchCount,
      subtotalAmount: money(subtotal),
      vatAmount: money(vat),
      totalAmount: money(total),
    }
  }

  async delete(ownerId: string, id: string): Promise<boolean> {
    const result = await this.prisma.invoice.deleteMany({ where: { id, ownerId } })
    return result.count > 0
  }
}
