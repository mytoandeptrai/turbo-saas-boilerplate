import { child, children, text } from '@/modules/invoice/infrastructure/adapters/xml/xml-node'

import type { InvoiceXmlAdapter } from '@/modules/invoice/infrastructure/adapters/xml/invoice-xml.adapter'
import type { XmlNode } from '@/modules/invoice/infrastructure/adapters/xml/xml-node'

/** FPT legacy layout: <EInvoice> */
export const fptAdapter: InvoiceXmlAdapter = {
  canParse: (document: XmlNode) => child(document, 'EInvoice') !== undefined,

  toRaw(document: XmlNode) {
    const root = child(document, 'EInvoice')
    const header = child(root, 'Header')
    const seller = child(root, 'Seller')
    const buyer = child(root, 'Buyer')
    const totals = child(root, 'Totals')

    return {
      provider: 'FPT',
      invoiceSeries: text(header, 'InvoiceSeries'),
      invoiceNumber: text(header, 'InvoiceNumber'),
      issuedAt: text(header, 'InvoiceDate'),
      currency: text(header, 'CurrencyCode'),
      exchangeRate: text(header, 'ExchangeRate'),
      sellerTaxCode: text(seller, 'TaxCode'),
      sellerName: text(seller, 'CompanyName'),
      sellerAddress: text(seller, 'Address'),
      buyerTaxCode: text(buyer, 'TaxCode'),
      buyerName: text(buyer, 'CompanyName'),
      buyerAddress: text(buyer, 'Address'),
      subtotalAmount: text(totals, 'SubTotal'),
      vatAmount: text(totals, 'TotalVAT'),
      totalAmount: text(totals, 'GrandTotal'),
      items: children(child(root, 'Details'), 'Line').map((item) => ({
        lineNumber: text(item, 'LineNumber'),
        code: text(item, 'ProductCode'),
        name: text(item, 'ProductName'),
        unit: text(item, 'UnitOfMeasure'),
        quantity: text(item, 'Quantity'),
        unitPrice: text(item, 'UnitPrice'),
        discountRate: text(item, 'DiscountRate'),
        discountAmount: text(item, 'DiscountAmount'),
        amount: text(item, 'LineAmount'),
        vatRate: text(item, 'VATRatePercent'),
        vatAmount: text(item, 'VATAmount'),
      })),
    }
  },
}
