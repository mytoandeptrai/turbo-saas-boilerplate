import type { RawInvoice } from '@/modules/invoice/domain/invoice.types'
import type { XmlNode } from '@/modules/invoice/infrastructure/adapters/xml/xml-node'

/** Maps one provider-specific XML layout to raw invoice values */
export interface InvoiceXmlAdapter {
  canParse(document: XmlNode): boolean
  toRaw(document: XmlNode): RawInvoice
}
