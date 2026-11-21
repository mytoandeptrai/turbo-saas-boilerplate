export type InvoiceParseErrorCode =
  | 'INVOICE_XML_MALFORMED'
  | 'INVOICE_UNKNOWN_FORMAT'
  | 'INVOICE_MISSING_FIELD'
  | 'INVOICE_INVALID_FIELD'

/** Raised when a document cannot be turned into a trustworthy invoice. Messages are user-facing. */
export class InvoiceParseError extends Error {
  constructor(
    readonly code: InvoiceParseErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'InvoiceParseError'
  }
}
