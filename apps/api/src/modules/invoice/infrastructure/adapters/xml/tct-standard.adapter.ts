import { child, children, text } from '@/modules/invoice/infrastructure/adapters/xml/xml-node'

import type { InvoiceXmlAdapter } from '@/modules/invoice/infrastructure/adapters/xml/invoice-xml.adapter'
import type { XmlNode } from '@/modules/invoice/infrastructure/adapters/xml/xml-node'

/**
 * Standard layout defined by 1450/QD-TCT, used by every certified provider:
 * HDon > DLHDon > (TTChung, NDHDon > (NBan, NMua, DSHHDVu, TToan)).
 * The legacy flat layout (HDon > TTChung, NBan, ...) is accepted as well.
 */
export const tctStandardAdapter: InvoiceXmlAdapter = {
  canParse: (document: XmlNode) => child(document, 'HDon') !== undefined,

  toRaw(document: XmlNode) {
    const root = child(document, 'HDon')
    const data = child(root, 'DLHDon')
    const envelope = data ?? root
    const general = child(envelope, 'TTChung')
    const content = child(envelope, 'NDHDon') ?? envelope
    const seller = child(content, 'NBan')
    const buyer = child(content, 'NMua')
    const totals = child(content, 'TToan')

    return {
      provider: data ? 'TCT' : 'VIETTEL',
      invoiceTemplate: text(general, 'KHMSHDon'),
      invoiceSeries: text(general, 'KHHDon'),
      invoiceNumber: text(general, 'SHDon'),
      issuedAt: text(general, 'NLap'),
      currency: text(general, 'DVTTe'),
      exchangeRate: text(general, 'TGia'),
      sellerTaxCode: text(seller, 'MST'),
      sellerName: text(seller, 'Ten'),
      sellerAddress: text(seller, 'DChi'),
      buyerTaxCode: text(buyer, 'MST'),
      buyerName: text(buyer, 'Ten') ?? text(buyer, 'HVTNMHang'),
      buyerAddress: text(buyer, 'DChi'),
      subtotalAmount: text(totals, 'TgTCThue'),
      vatAmount: text(totals, 'TgTThue'),
      totalAmount: text(totals, 'TgTTTBSo'),
      items: children(child(content, 'DSHHDVu'), 'HHDVu').map((item) => ({
        kind: text(item, 'TChat'),
        lineNumber: text(item, 'STT'),
        code: text(item, 'MHHDVu'),
        name: text(item, 'THHDVu'),
        unit: text(item, 'DVTinh'),
        quantity: text(item, 'SLuong'),
        unitPrice: text(item, 'DGia'),
        discountRate: text(item, 'TLCKhau'),
        discountAmount: text(item, 'STCKhau'),
        amount: text(item, 'ThTien'),
        vatRate: text(item, 'TSuat'),
        vatAmount: text(item, 'TThue'),
      })),
    }
  },
}
