import { child, children, text } from '@/modules/invoice/infrastructure/adapters/xml/xml-node'

import type { InvoiceXmlAdapter } from '@/modules/invoice/infrastructure/adapters/xml/invoice-xml.adapter'
import type { XmlNode } from '@/modules/invoice/infrastructure/adapters/xml/xml-node'

/** VNPT legacy layout: <SInvoice> */
export const vnptAdapter: InvoiceXmlAdapter = {
  canParse: (document: XmlNode) => child(document, 'SInvoice') !== undefined,

  toRaw(document: XmlNode) {
    const root = child(document, 'SInvoice')
    const seller = child(root, 'Seller')
    const buyer = child(root, 'Buyer')
    const summary = child(root, 'Summary')

    return {
      provider: 'VNPT',
      invoiceSeries: text(root, 'InvoiceSeries'),
      invoiceNumber: text(root, 'InvoiceNo'),
      issuedAt: text(root, 'InvoiceDate'),
      currency: text(root, 'Currency'),
      exchangeRate: text(root, 'ExchangeRate'),
      sellerTaxCode: text(seller, 'SellerTaxCode'),
      sellerName: text(seller, 'SellerName'),
      sellerAddress: text(seller, 'SellerAddress'),
      buyerTaxCode: text(buyer, 'BuyerTaxCode'),
      buyerName: text(buyer, 'BuyerName'),
      buyerAddress: text(buyer, 'BuyerAddress'),
      subtotalAmount: text(summary, 'TotalAmount'),
      vatAmount: text(summary, 'TotalVATAmount'),
      totalAmount: text(summary, 'TotalPayment'),
      items: children(child(root, 'Products'), 'Product').map((item) => ({
        lineNumber: text(item, 'LineNo'),
        code: text(item, 'ProdCode'),
        name: text(item, 'ProdName'),
        unit: text(item, 'ProdUnit'),
        quantity: text(item, 'ProdQuantity'),
        unitPrice: text(item, 'ProdPrice'),
        discountRate: text(item, 'Discount'),
        discountAmount: text(item, 'DiscountAmt'),
        amount: text(item, 'Amount'),
        vatRate: text(item, 'VATRate'),
        vatAmount: text(item, 'VATAmount'),
      })),
    }
  },
}
