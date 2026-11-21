import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

import {
  INVOICE_ITEM_KINDS,
  INVOICE_PROVIDERS,
  INVOICE_STATUSES,
} from '@/modules/invoice/domain/invoice.types'
import { OffsetListResponseDto } from '@/shared-kernel/infrastructure/dtos/list-response.dto'

import type { InvoiceStats } from '@/modules/invoice/application/ports/invoice.repository.port'
import type {
  UploadBatchResult,
  UploadOutcome,
} from '@/modules/invoice/application/services/invoice.service'
import type {
  InvoiceItemKind,
  InvoiceItemRecord,
  InvoiceProvider,
  InvoiceRecord,
  InvoiceStatus,
  InvoiceWithItems,
  ValidationIssue,
} from '@/modules/invoice/domain/invoice.types'

const UPLOAD_OUTCOMES = ['CREATED', 'DUPLICATE', 'INVALID', 'UNSUPPORTED'] as const

export class InvoiceValidationIssueDto {
  @ApiProperty({
    enum: ['TOTAL_MISMATCH', 'SUBTOTAL_MISMATCH', 'VAT_MISMATCH', 'LINE_AMOUNT_MISMATCH'],
  })
  code: string

  @ApiProperty({ enum: ['error', 'warning'] })
  severity: string

  @ApiProperty({ description: 'Human-readable explanation (Vietnamese)' })
  message: string

  static from(issue: ValidationIssue): InvoiceValidationIssueDto {
    const dto = new InvoiceValidationIssueDto()
    dto.code = issue.code
    dto.severity = issue.severity
    dto.message = issue.message
    return dto
  }
}

export class InvoiceItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string

  @ApiProperty({
    enum: INVOICE_ITEM_KINDS,
    description: 'Line nature: goods/service, promotion, trade discount or note',
  })
  kind: InvoiceItemKind

  @ApiProperty({ example: 1 })
  lineNumber: number

  @ApiProperty({ type: String, nullable: true, example: 'GAO-ST25' })
  code: string | null

  @ApiProperty({ example: 'Gạo ST25 túi 5kg' })
  name: string

  @ApiProperty({ type: String, nullable: true, example: 'Túi' })
  unit: string | null

  @ApiProperty({ type: String, nullable: true, description: 'Decimal string', example: '20' })
  quantity: string | null

  @ApiProperty({ type: String, nullable: true, description: 'Decimal string', example: '180000' })
  unitPrice: string | null

  @ApiProperty({ description: 'Decimal string', example: '0.00' })
  discountAmount: string

  @ApiProperty({ description: 'Line amount before tax, decimal string', example: '3600000.00' })
  amount: string

  @ApiProperty({ type: String, nullable: true, example: '5%' })
  vatRate: string | null

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Decimal string; null when the invoice has no per-line tax',
    example: '180000.00',
  })
  vatAmount: string | null

  static fromRecord(item: InvoiceItemRecord): InvoiceItemResponseDto {
    const dto = new InvoiceItemResponseDto()
    dto.id = item.id
    dto.kind = item.kind
    dto.lineNumber = item.lineNumber
    dto.code = item.code
    dto.name = item.name
    dto.unit = item.unit
    dto.quantity = item.quantity
    dto.unitPrice = item.unitPrice
    dto.discountAmount = item.discountAmount
    dto.amount = item.amount
    dto.vatRate = item.vatRate
    dto.vatAmount = item.vatAmount
    return dto
  }
}

export class InvoiceResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string

  @ApiProperty({ enum: INVOICE_PROVIDERS })
  provider: InvoiceProvider

  @ApiProperty({ enum: INVOICE_STATUSES })
  status: InvoiceStatus

  @ApiProperty({ description: 'Template code (KHMSHDon)', example: '1' })
  invoiceTemplate: string

  @ApiProperty({ description: 'Series (KHHDon)', example: 'C26TAA' })
  invoiceSeries: string

  @ApiProperty({ description: 'Invoice number (SHDon)', example: '00000123' })
  invoiceNumber: string

  @ApiProperty({ description: 'Issue date (YYYY-MM-DD)', example: '2026-03-12' })
  issuedAt: string

  @ApiProperty({ example: 'VND' })
  currency: string

  @ApiProperty({ example: '0312345678' })
  sellerTaxCode: string

  @ApiProperty({ example: 'CÔNG TY TNHH THỰC PHẨM VIỆT' })
  sellerName: string

  @ApiProperty({ type: String, nullable: true })
  sellerAddress: string | null

  @ApiProperty({ type: String, nullable: true })
  buyerTaxCode: string | null

  @ApiProperty({ type: String, nullable: true })
  buyerName: string | null

  @ApiProperty({ type: String, nullable: true })
  buyerAddress: string | null

  @ApiProperty({ description: 'Amount before tax, decimal string', example: '5100000.00' })
  subtotalAmount: string

  @ApiProperty({ description: 'VAT amount, decimal string', example: '300000.00' })
  vatAmount: string

  @ApiProperty({ description: 'Total payable, decimal string', example: '5400000.00' })
  totalAmount: string

  @ApiProperty({ type: () => InvoiceValidationIssueDto, isArray: true })
  validationIssues: InvoiceValidationIssueDto[]

  @ApiProperty({ example: 'hoa-don-00000123.xml' })
  sourceFileName: string

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date

  protected static assign(dto: InvoiceResponseDto, invoice: InvoiceRecord): void {
    dto.id = invoice.id
    dto.provider = invoice.provider
    dto.status = invoice.status
    dto.invoiceTemplate = invoice.invoiceTemplate
    dto.invoiceSeries = invoice.invoiceSeries
    dto.invoiceNumber = invoice.invoiceNumber
    dto.issuedAt = invoice.issuedAt.toISOString().slice(0, 10)
    dto.currency = invoice.currency
    dto.sellerTaxCode = invoice.sellerTaxCode
    dto.sellerName = invoice.sellerName
    dto.sellerAddress = invoice.sellerAddress
    dto.buyerTaxCode = invoice.buyerTaxCode
    dto.buyerName = invoice.buyerName
    dto.buyerAddress = invoice.buyerAddress
    dto.subtotalAmount = invoice.subtotalAmount
    dto.vatAmount = invoice.vatAmount
    dto.totalAmount = invoice.totalAmount
    dto.validationIssues = invoice.validationIssues.map((issue) =>
      InvoiceValidationIssueDto.from(issue),
    )
    dto.sourceFileName = invoice.sourceFileName
    dto.createdAt = invoice.createdAt
  }

  static fromRecord(invoice: InvoiceRecord): InvoiceResponseDto {
    const dto = new InvoiceResponseDto()
    InvoiceResponseDto.assign(dto, invoice)
    return dto
  }
}

export class InvoiceDetailResponseDto extends InvoiceResponseDto {
  @ApiProperty({ type: () => InvoiceItemResponseDto, isArray: true })
  items: InvoiceItemResponseDto[]

  static fromRecordWithItems(invoice: InvoiceWithItems): InvoiceDetailResponseDto {
    const dto = new InvoiceDetailResponseDto()
    InvoiceResponseDto.assign(dto, invoice)
    dto.items = invoice.items.map((item) => InvoiceItemResponseDto.fromRecord(item))
    return dto
  }
}

export class InvoiceListResponseDto extends OffsetListResponseDto<InvoiceResponseDto> {
  @ApiProperty({ type: () => InvoiceResponseDto, isArray: true })
  declare data: InvoiceResponseDto[]
}

export class InvoiceStatsResponseDto {
  @ApiProperty({ example: 42 })
  totalInvoices: number

  @ApiProperty({ example: 40 })
  validCount: number

  @ApiProperty({ example: 2 })
  mismatchCount: number

  @ApiProperty({ description: 'Decimal string', example: '125000000.00' })
  subtotalAmount: string

  @ApiProperty({ description: 'Decimal string', example: '10500000.00' })
  vatAmount: string

  @ApiProperty({ description: 'Decimal string', example: '135500000.00' })
  totalAmount: string

  static from(stats: InvoiceStats): InvoiceStatsResponseDto {
    return Object.assign(new InvoiceStatsResponseDto(), stats)
  }
}

export class InvoiceUploadFileResultDto {
  @ApiProperty({ example: 'hoa-don-00000123.xml' })
  fileName: string

  @ApiProperty({ enum: UPLOAD_OUTCOMES })
  outcome: UploadOutcome

  @ApiPropertyOptional({ format: 'uuid', description: 'Present when outcome is CREATED' })
  invoiceId?: string

  @ApiPropertyOptional({ example: '00000123' })
  invoiceNumber?: string

  @ApiPropertyOptional({ enum: INVOICE_STATUSES, description: 'Present when outcome is CREATED' })
  status?: InvoiceStatus

  @ApiPropertyOptional({ description: 'Error code when not created', example: 'INVOICE_DUPLICATE' })
  code?: string

  @ApiPropertyOptional({ description: 'Human-readable reason (Vietnamese)' })
  message?: string
}

export class InvoiceUploadResponseDto {
  @ApiProperty({ example: 3 })
  total: number

  @ApiProperty({ example: 1 })
  created: number

  @ApiProperty({ example: 1 })
  duplicated: number

  @ApiProperty({ example: 1 })
  failed: number

  @ApiProperty({ type: () => InvoiceUploadFileResultDto, isArray: true })
  results: InvoiceUploadFileResultDto[]

  static from(result: UploadBatchResult): InvoiceUploadResponseDto {
    const dto = new InvoiceUploadResponseDto()
    dto.total = result.total
    dto.created = result.created
    dto.duplicated = result.duplicated
    dto.failed = result.failed
    dto.results = result.results.map((entry) =>
      Object.assign(new InvoiceUploadFileResultDto(), entry),
    )
    return dto
  }
}
