import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { InvoiceParseError } from '@/modules/invoice/domain/invoice-parse.error'
import { reconcileInvoice } from '@/modules/invoice/domain/invoice-reconciliation'
import { FastXmlInvoiceParser } from '@/modules/invoice/infrastructure/adapters/xml/fast-xml-invoice-parser'

const FIXTURES = path.resolve(import.meta.dirname, '../../../../../../test/fixtures/invoices')
const fixture = (name: string) => readFileSync(path.join(FIXTURES, name))

const parser = new FastXmlInvoiceParser()

function errorOf(content: Buffer): InvoiceParseError {
  try {
    parser.parse(content)
  } catch (error) {
    if (error instanceof InvoiceParseError) return error
    throw error
  }
  throw new Error('expected InvoiceParseError')
}

describe('fastXmlInvoiceParser', () => {
  describe('1450/QD-TCT standard layout', () => {
    it('maps header, parties, totals and items', () => {
      const invoice = parser.parse(fixture('tct-valid.xml'))

      expect(invoice).toMatchObject({
        provider: 'TCT',
        invoiceTemplate: '1',
        invoiceSeries: 'C26TAA',
        invoiceNumber: '00000123',
        issuedAt: '2026-03-12',
        currency: 'VND',
        sellerTaxCode: '0312345678',
        sellerAddress: '12 Nguyễn Văn Linh, Quận 7, TP. Hồ Chí Minh',
        buyerTaxCode: '8123456789001',
        buyerName: 'HỘ KINH DOANH TẠP HÓA CÔ BA',
        subtotalAmount: '5100000.00',
        vatAmount: '300000.00',
        totalAmount: '5400000.00',
      })
      expect(invoice.items).toHaveLength(3)
      expect(invoice.items[1]).toMatchObject({
        kind: 'GOODS',
        lineNumber: 2,
        code: 'NM-CHINSU',
        name: 'Nước mắm Chinsu 500ml',
        unit: 'Chai',
        quantity: '48.000000',
        unitPrice: '32500.000000',
        discountAmount: '60000.00',
        amount: '1500000.00',
        vatRate: '8%',
        vatAmount: null,
      })
      expect(invoice.items[2]!.kind).toBe('NOTE')
      expect(reconcileInvoice(invoice)).toEqual({ status: 'VALID', issues: [] })
    })

    it('detects by structure: a seller named after other providers stays TCT', () => {
      const invoice = parser.parse(fixture('tct-valid.xml'))

      expect(invoice.sellerName).toBe('CÔNG TY TNHH THỰC PHẨM FPT & MISA VIỆT NAM')
      expect(invoice.provider).toBe('TCT')
    })

    it('parses an invoice whose totals do not add up so it can be flagged', () => {
      const invoice = parser.parse(fixture('tct-amount-mismatch.xml'))

      expect(invoice.totalAmount).toBe('5500000.00')
      expect(reconcileInvoice(invoice).status).toBe('MISMATCH')
    })

    it('handles namespace prefixes, a single item and missing tax tags', () => {
      const invoice = parser.parse(fixture('tct-sales-invoice.xml'))

      expect(invoice).toMatchObject({
        invoiceTemplate: '2',
        invoiceNumber: '00000045',
        buyerTaxCode: null,
        subtotalAmount: '1050000.00',
        vatAmount: '0.00',
        totalAmount: '1050000.00',
      })
      expect(invoice.items).toHaveLength(1)
      expect(invoice.items[0]).toMatchObject({ lineNumber: 1, vatRate: null })
      expect(reconcileInvoice(invoice).status).toBe('VALID')
    })

    it('accepts the legacy flat layout and maps KHMSHDon to the template', () => {
      const invoice = parser.parse(fixture('tct-flat-legacy.xml'))

      expect(invoice).toMatchObject({
        provider: 'VIETTEL',
        invoiceTemplate: 'VT23',
        invoiceSeries: '',
        invoiceNumber: '0000004',
        totalAmount: '4510000.00',
      })
      expect(reconcileInvoice(invoice)).toEqual({ status: 'VALID', issues: [] })
    })

    it('ignores a UTF-8 byte order mark', () => {
      const withBom = Buffer.concat([Buffer.from('\uFEFF', 'utf8'), fixture('tct-valid.xml')])

      expect(parser.parse(withBom).invoiceNumber).toBe('00000123')
    })
  })

  describe('provider layouts', () => {
    it.each([
      ['vnpt-valid.xml', 'VNPT', '0000002', 'VN23', '0111222333', '52250000.00', 1],
      ['misa-valid.xml', 'MISA', '0000003', 'MS23', '0555666777', '11935000.00', 2],
      ['fpt-valid.xml', 'FPT', '0000005', 'FP23', '0300300300', '297000000.00', 2],
      ['tct-generic-valid.xml', 'TCT', '0000001', 'KK23', '0123456789', '22880000.00', 2],
    ])('parses %s', (file, provider, number, series, taxCode, total, itemCount) => {
      const invoice = parser.parse(fixture(file))

      expect(invoice).toMatchObject({
        provider,
        invoiceTemplate: '',
        invoiceSeries: series,
        invoiceNumber: number,
        sellerTaxCode: taxCode,
        totalAmount: total,
      })
      expect(invoice.items).toHaveLength(itemCount)
      expect(invoice.items[0]!.vatRate).toBe('10%')
      expect(reconcileInvoice(invoice)).toEqual({ status: 'VALID', issues: [] })
    })
  })

  describe('rejected documents', () => {
    it('rejects truncated XML', () => {
      expect(errorOf(fixture('malformed.xml')).code).toBe('INVOICE_XML_MALFORMED')
    })

    it('rejects DOCTYPE declarations (XXE)', () => {
      expect(errorOf(fixture('xxe-doctype.xml')).code).toBe('INVOICE_XML_MALFORMED')
    })

    it('rejects content that is not XML at all', () => {
      expect(errorOf(Buffer.from('not xml')).code).toBe('INVOICE_XML_MALFORMED')
    })

    it('rejects well-formed XML that is not an invoice', () => {
      expect(errorOf(fixture('unknown-format.xml')).code).toBe('INVOICE_UNKNOWN_FORMAT')
    })

    it('rejects an invoice without a seller tax code', () => {
      const error = errorOf(fixture('missing-seller-tax-code.xml'))

      expect(error.code).toBe('INVOICE_MISSING_FIELD')
      expect(error.message).toContain('mã số thuế người bán')
    })
  })
})
