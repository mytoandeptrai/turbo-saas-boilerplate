import type {
  InvoiceProvider,
  InvoiceRecord,
  InvoiceStatus,
  InvoiceWithItems,
  ParsedInvoice,
  ValidationIssue,
} from '@/modules/invoice/domain/invoice.types'

export interface CreateInvoiceInput {
  ownerId: string
  invoice: ParsedInvoice
  status: InvoiceStatus
  validationIssues: ValidationIssue[]
  sourceFileName: string
  sourceFileHash: string
}

export interface InvoiceFilter {
  q?: string
  status?: InvoiceStatus
  provider?: InvoiceProvider
  /** Inclusive, YYYY-MM-DD */
  issuedFrom?: string
  /** Inclusive, YYYY-MM-DD */
  issuedTo?: string
}

export interface InvoiceStats {
  totalInvoices: number
  validCount: number
  mismatchCount: number
  subtotalAmount: string
  vatAmount: string
  totalAmount: string
}

export interface InvoiceRepository {
  /** Returns null when the invoice identity already exists (unique index violation) */
  create(input: CreateInvoiceInput): Promise<InvoiceRecord | null>

  findPage(
    ownerId: string,
    filter: InvoiceFilter,
    page: number,
    pageSize: number,
  ): Promise<{ data: InvoiceRecord[]; total: number }>

  findByIdWithItems(ownerId: string, id: string): Promise<InvoiceWithItems | null>

  count(ownerId: string, filter: InvoiceFilter): Promise<number>

  findAllWithItems(
    ownerId: string,
    filter: InvoiceFilter,
    limit: number,
  ): Promise<InvoiceWithItems[]>

  getStats(ownerId: string, filter: InvoiceFilter): Promise<InvoiceStats>

  delete(ownerId: string, id: string): Promise<boolean>
}

export const INVOICE_REPOSITORY = Symbol('INVOICE_REPOSITORY')
