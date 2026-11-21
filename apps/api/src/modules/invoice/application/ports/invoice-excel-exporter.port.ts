import type { InvoiceWithItems } from '@/modules/invoice/domain/invoice.types'

export interface InvoiceExcelExporter {
  /** Builds an .xlsx workbook with an invoice sheet and a line item sheet */
  export(invoices: InvoiceWithItems[]): Promise<Buffer>
}

export const INVOICE_EXCEL_EXPORTER = Symbol('INVOICE_EXCEL_EXPORTER')
