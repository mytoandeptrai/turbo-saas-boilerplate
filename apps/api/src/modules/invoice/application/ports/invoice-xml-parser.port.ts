import type { ParsedInvoice } from '@/modules/invoice/domain/invoice.types'

export interface InvoiceXmlParser {
  /**
   * Parses an e-invoice XML document.
   * @throws InvoiceParseError when the document is malformed, unknown or incomplete
   */
  parse(content: Buffer): ParsedInvoice
}

export const INVOICE_XML_PARSER = Symbol('INVOICE_XML_PARSER')
