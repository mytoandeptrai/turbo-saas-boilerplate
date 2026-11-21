import { child, children, text } from '@/modules/invoice/infrastructure/adapters/xml/xml-node'

import type { InvoiceXmlAdapter } from '@/modules/invoice/infrastructure/adapters/xml/invoice-xml.adapter'
import type { XmlNode } from '@/modules/invoice/infrastructure/adapters/xml/xml-node'

function invoiceRoot(document: XmlNode): XmlNode | undefined {
  // A file holding several invoices yields the first one only
  return child(document, 'Invoices', 'Invoice') ?? child(document, 'Invoice')
}

/** Generic English-tag layout: <Invoice> or <Invoices><Invoice>. Must be tried last. */
export const tctGenericAdapter: InvoiceXmlAdapter = {
  canParse: (document: XmlNode) => invoiceRoot(document) !== undefined,

  toRaw(document: XmlNode) {
    const root = invoiceRoot(document)
    const seller = child(root, 'Seller')
    const buyer = child(root, 'Buyer')

    return {
      provider: 'TCT',
      invoiceSeries: text(root, 'InvoiceSeries'),
      invoiceNumber: text(root, 'InvoiceNo'),
      issuedAt: text(root, 'InvoiceDate'),
      currency: text(root, 'Currency'),
      exchangeRate: text(root, 'ExchangeRate'),
      sellerTaxCode: text(seller, 'TaxID'),
      sellerName: text(seller, 'Name'),
      sellerAddress: text(seller, 'Address'),
      buyerTaxCode: text(buyer, 'TaxID'),
      buyerName: text(buyer, 'Name'),
      buyerAddress: text(buyer, 'Address'),
      subtotalAmount: text(root, 'SubtotalAmount'),
      vatAmount: text(root, 'TaxAmount'),
      totalAmount: text(root, 'TotalAmount'),
      items: children(child(root, 'Items'), 'Item').map((item) => ({
        lineNumber: text(item, 'ItemNo'),
        code: text(item, 'ItemCode'),
        name: text(item, 'ItemName'),
        unit: text(item, 'UnitOfMeasure'),
        quantity: text(item, 'Quantity'),
        unitPrice: text(item, 'UnitPrice'),
        discountRate: text(item, 'Discount'),
        amount: text(item, 'Amount'),
        vatRate: text(item, 'TaxRatePercent'),
        vatAmount: text(item, 'TaxAmount'),
      })),
    }
  },
}
