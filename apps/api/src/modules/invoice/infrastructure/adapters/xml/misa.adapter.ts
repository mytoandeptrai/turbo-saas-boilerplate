import { child, children, text } from '@/modules/invoice/infrastructure/adapters/xml/xml-node'

import type { InvoiceXmlAdapter } from '@/modules/invoice/infrastructure/adapters/xml/invoice-xml.adapter'
import type { XmlNode } from '@/modules/invoice/infrastructure/adapters/xml/xml-node'

/** MISA legacy layout: <Invoice><InvoiceData> */
export const misaAdapter: InvoiceXmlAdapter = {
  canParse: (document: XmlNode) => child(document, 'Invoice', 'InvoiceData') !== undefined,

  toRaw(document: XmlNode) {
    const root = child(document, 'Invoice')
    const header = child(root, 'InvoiceData')
    const seller = child(root, 'SellerInfo')
    const buyer = child(root, 'BuyerInfo')
    const totals = child(root, 'TotalSection')

    return {
      provider: 'MISA',
      invoiceSeries: text(header, 'InvoiceSeries'),
      invoiceNumber: text(header, 'InvoiceNumber'),
      issuedAt: text(header, 'InvoiceDate'),
      currency: text(header, 'CurrencyCode'),
      exchangeRate: text(header, 'ExchangeRate'),
      sellerTaxCode: text(seller, 'MST'),
      sellerName: text(seller, 'CompanyName'),
      sellerAddress: text(seller, 'Address'),
      buyerTaxCode: text(buyer, 'MST'),
      buyerName: text(buyer, 'CompanyName'),
      buyerAddress: text(buyer, 'Address'),
      subtotalAmount: text(totals, 'TongTienHang'),
      vatAmount: text(totals, 'TongTienThue'),
      totalAmount: text(totals, 'TongThanhToan'),
      items: children(child(root, 'InvoiceDetail'), 'Item').map((item) => ({
        lineNumber: text(item, 'STT'),
        code: text(item, 'MaHang'),
        name: text(item, 'TenHang'),
        unit: text(item, 'DVT'),
        quantity: text(item, 'SoLuong'),
        unitPrice: text(item, 'DonGia'),
        discountRate: text(item, 'ChietKhau'),
        discountAmount: text(item, 'TienCK'),
        amount: text(item, 'ThanhTien'),
        vatRate: text(item, 'ThueSuat'),
        vatAmount: text(item, 'TienThue'),
      })),
    }
  },
}
