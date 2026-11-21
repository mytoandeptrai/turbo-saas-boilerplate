import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsIn, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator'

import { INVOICE_PROVIDERS, INVOICE_STATUSES } from '@/modules/invoice/domain/invoice.types'
import { OffsetPaginationDto } from '@/shared-kernel/infrastructure/dtos/offset-pagination.dto'

import type { InvoiceFilter } from '@/modules/invoice/application/ports/invoice.repository.port'
import type { InvoiceProvider, InvoiceStatus } from '@/modules/invoice/domain/invoice.types'

interface InvoiceFilterFields {
  q?: string
  status?: InvoiceStatus
  provider?: InvoiceProvider
  issuedFrom?: string
  issuedTo?: string
}

export function toInvoiceFilter(query: InvoiceFilterFields): InvoiceFilter {
  return {
    q: query.q,
    status: query.status,
    provider: query.provider,
    issuedFrom: query.issuedFrom,
    issuedTo: query.issuedTo,
  }
}

export class InvoiceFilterDto implements InvoiceFilterFields {
  @ApiPropertyOptional({
    description: 'Search by invoice number, seller name or seller tax code',
    example: '0312345678',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string

  @ApiPropertyOptional({ enum: INVOICE_STATUSES, description: 'Reconciliation status' })
  @IsOptional()
  @IsIn(INVOICE_STATUSES)
  status?: InvoiceStatus

  @ApiPropertyOptional({ enum: INVOICE_PROVIDERS, description: 'E-invoice provider' })
  @IsOptional()
  @IsIn(INVOICE_PROVIDERS)
  provider?: InvoiceProvider

  @ApiPropertyOptional({ description: 'Issue date from (inclusive)', example: '2026-01-01' })
  @IsOptional()
  @IsISO8601({ strict: true })
  @MaxLength(10)
  issuedFrom?: string

  @ApiPropertyOptional({ description: 'Issue date to (inclusive)', example: '2026-03-31' })
  @IsOptional()
  @IsISO8601({ strict: true })
  @MaxLength(10)
  issuedTo?: string
}

export class InvoiceQueryDto extends OffsetPaginationDto implements InvoiceFilterFields {
  @ApiPropertyOptional({
    description: 'Search by invoice number, seller name or seller tax code',
    example: '0312345678',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string

  @ApiPropertyOptional({ enum: INVOICE_STATUSES, description: 'Reconciliation status' })
  @IsOptional()
  @IsIn(INVOICE_STATUSES)
  status?: InvoiceStatus

  @ApiPropertyOptional({ enum: INVOICE_PROVIDERS, description: 'E-invoice provider' })
  @IsOptional()
  @IsIn(INVOICE_PROVIDERS)
  provider?: InvoiceProvider

  @ApiPropertyOptional({ description: 'Issue date from (inclusive)', example: '2026-01-01' })
  @IsOptional()
  @IsISO8601({ strict: true })
  @MaxLength(10)
  issuedFrom?: string

  @ApiPropertyOptional({ description: 'Issue date to (inclusive)', example: '2026-03-31' })
  @IsOptional()
  @IsISO8601({ strict: true })
  @MaxLength(10)
  issuedTo?: string
}
