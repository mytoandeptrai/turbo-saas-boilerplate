export const INVOICE_PROVIDERS = ['TCT', 'VNPT', 'MISA', 'VIETTEL', 'FPT'] as const
export type InvoiceProvider = (typeof INVOICE_PROVIDERS)[number]

export const INVOICE_STATUSES = ['VALID', 'MISMATCH'] as const
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

/** Line nature (TChat in 1450/QD-TCT) */
export const INVOICE_ITEM_KINDS = ['GOODS', 'PROMOTION', 'DISCOUNT', 'NOTE'] as const
export type InvoiceItemKind = (typeof INVOICE_ITEM_KINDS)[number]

/** Untrusted values exactly as read from a provider XML document */
export interface RawInvoiceItem {
  kind?: string
  lineNumber?: string
  code?: string
  name?: string
  unit?: string
  quantity?: string
  unitPrice?: string
  discountRate?: string
  discountAmount?: string
  amount?: string
  vatRate?: string
  vatAmount?: string
}

export interface RawInvoice {
  provider: InvoiceProvider
  invoiceTemplate?: string
  invoiceSeries?: string
  invoiceNumber?: string
  issuedAt?: string
  currency?: string
  exchangeRate?: string
  sellerTaxCode?: string
  sellerName?: string
  sellerAddress?: string
  buyerTaxCode?: string
  buyerName?: string
  buyerAddress?: string
  subtotalAmount?: string
  vatAmount?: string
  totalAmount?: string
  items: RawInvoiceItem[]
}

/** Normalised invoice. Every amount is a plain decimal string. */
export interface ParsedInvoiceItem {
  kind: InvoiceItemKind
  lineNumber: number
  code: string | null
  name: string
  unit: string | null
  quantity: string | null
  unitPrice: string | null
  discountAmount: string
  amount: string
  vatRate: string | null
  vatAmount: string | null
}

export interface ParsedInvoice {
  provider: InvoiceProvider
  invoiceTemplate: string
  invoiceSeries: string
  invoiceNumber: string
  /** ISO date, YYYY-MM-DD */
  issuedAt: string
  currency: string
  exchangeRate: string
  sellerTaxCode: string
  sellerName: string
  sellerAddress: string | null
  buyerTaxCode: string | null
  buyerName: string | null
  buyerAddress: string | null
  subtotalAmount: string
  vatAmount: string
  totalAmount: string
  items: ParsedInvoiceItem[]
}

export type ValidationIssueCode =
  | 'TOTAL_MISMATCH'
  | 'SUBTOTAL_MISMATCH'
  | 'VAT_MISMATCH'
  | 'LINE_AMOUNT_MISMATCH'

export interface ValidationIssue {
  code: ValidationIssueCode
  severity: 'error' | 'warning'
  message: string
}

export interface InvoiceItemRecord {
  id: string
  kind: InvoiceItemKind
  lineNumber: number
  code: string | null
  name: string
  unit: string | null
  quantity: string | null
  unitPrice: string | null
  discountAmount: string
  amount: string
  vatRate: string | null
  vatAmount: string | null
}

/** Persisted invoice as seen by the application layer */
export interface InvoiceRecord {
  id: string
  ownerId: string
  provider: InvoiceProvider
  status: InvoiceStatus
  invoiceTemplate: string
  invoiceSeries: string
  invoiceNumber: string
  issuedAt: Date
  currency: string
  exchangeRate: string
  sellerTaxCode: string
  sellerName: string
  sellerAddress: string | null
  buyerTaxCode: string | null
  buyerName: string | null
  buyerAddress: string | null
  subtotalAmount: string
  vatAmount: string
  totalAmount: string
  validationIssues: ValidationIssue[]
  sourceFileName: string
  createdAt: Date
}

export interface InvoiceWithItems extends InvoiceRecord {
  items: InvoiceItemRecord[]
}
