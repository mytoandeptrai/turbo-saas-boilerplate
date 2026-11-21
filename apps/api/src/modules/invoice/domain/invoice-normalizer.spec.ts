import { describe, expect, it } from 'vitest'

import {
  normalizeInvoice,
  normalizeTaxCode,
  normalizeVatRate,
  parseInvoiceDate,
} from '@/modules/invoice/domain/invoice-normalizer'
import { InvoiceParseError } from '@/modules/invoice/domain/invoice-parse.error'

import type { RawInvoice } from '@/modules/invoice/domain/invoice.types'

const NOW = new Date('2026-06-30T00:00:00Z')

function rawInvoice(overrides: Partial<RawInvoice> = {}): RawInvoice {
  return {
    provider: 'TCT',
    invoiceTemplate: '1',
    invoiceSeries: 'C26TAA',
    invoiceNumber: '00000123',
    issuedAt: '2026-06-15',
    sellerTaxCode: '0101234567',
    sellerName: '  Công ty A  ',
    subtotalAmount: '1000000',
    vatAmount: '100000',
    totalAmount: '1100000',
    items: [{ name: 'Gạo', quantity: '10', unitPrice: '100000', amount: '1000000', vatRate: '10' }],
    ...overrides,
  }
}

function errorOf(fn: () => unknown): InvoiceParseError {
  try {
    fn()
  } catch (error) {
    if (error instanceof InvoiceParseError) return error
    throw error
  }
  throw new Error('expected InvoiceParseError')
}

describe('parseInvoiceDate', () => {
  it.each([
    ['2026-01-15', '2026-01-15'],
    ['2026-01-15T10:30:00', '2026-01-15'],
    ['2026-01-15T10:30:00+07:00', '2026-01-15'],
    ['2026-01-15 10:30:00', '2026-01-15'],
    ['15/01/2026', '2026-01-15'],
    ['15/01/2026 10:30:00', '2026-01-15'],
  ])('parses %s', (input, expected) => {
    expect(parseInvoiceDate(input)).toBe(expected)
  })

  it.each(['2026-02-30', '31/04/2026', '2026/01/15', 'hôm nay', ''])('rejects %s', (input) => {
    expect(parseInvoiceDate(input)).toBeNull()
  })
})

describe('normalizeTaxCode', () => {
  it('accepts 10 and 13 digit codes and strips the separator', () => {
    expect(normalizeTaxCode('0101234567')).toBe('0101234567')
    expect(normalizeTaxCode('0101234567-001')).toBe('0101234567001')
    expect(normalizeTaxCode(' 0101234567001 ')).toBe('0101234567001')
  })

  it.each(['123', '01012345678', 'ABCDEFGHIJ', '0101234567-01'])('rejects %s', (input) => {
    expect(normalizeTaxCode(input)).toBeNull()
  })
})

describe('normalizeVatRate', () => {
  it('normalises numeric rates and keeps non-numeric ones', () => {
    expect(normalizeVatRate('10')).toBe('10%')
    expect(normalizeVatRate('8%')).toBe('8%')
    expect(normalizeVatRate('kct')).toBe('KCT')
    expect(normalizeVatRate(undefined)).toBeNull()
  })
})

describe('normalizeInvoice', () => {
  it('normalises a complete invoice', () => {
    const invoice = normalizeInvoice(rawInvoice(), NOW)

    expect(invoice).toMatchObject({
      invoiceNumber: '00000123',
      issuedAt: '2026-06-15',
      currency: 'VND',
      exchangeRate: '1.000000',
      sellerName: 'Công ty A',
      subtotalAmount: '1000000.00',
      vatAmount: '100000.00',
      totalAmount: '1100000.00',
    })
    expect(invoice.items[0]).toMatchObject({
      kind: 'GOODS',
      lineNumber: 1,
      quantity: '10.000000',
      amount: '1000000.00',
      vatRate: '10%',
      vatAmount: null,
    })
  })

  it('derives subtotal and VAT for sales invoices without tax tags', () => {
    const invoice = normalizeInvoice(
      rawInvoice({ subtotalAmount: undefined, vatAmount: undefined, totalAmount: '500000' }),
      NOW,
    )

    expect(invoice.subtotalAmount).toBe('500000.00')
    expect(invoice.vatAmount).toBe('0.00')
  })

  it('derives the discount amount from a discount rate', () => {
    const invoice = normalizeInvoice(
      rawInvoice({
        items: [{ name: 'A', quantity: '12', unitPrice: '1000000', discountRate: '10' }],
      }),
      NOW,
    )

    expect(invoice.items[0]!.discountAmount).toBe('1200000.00')
  })

  it.each([
    ['invoiceNumber', 'số hóa đơn'],
    ['issuedAt', 'ngày lập'],
    ['sellerTaxCode', 'mã số thuế người bán'],
    ['totalAmount', 'tổng tiền thanh toán'],
  ] as const)('rejects an invoice missing %s', (field, label) => {
    const error = errorOf(() => normalizeInvoice(rawInvoice({ [field]: '  ' }), NOW))

    expect(error.code).toBe('INVOICE_MISSING_FIELD')
    expect(error.message).toContain(label)
  })

  it('rejects an invalid seller tax code', () => {
    expect(errorOf(() => normalizeInvoice(rawInvoice({ sellerTaxCode: '12345' }), NOW)).code).toBe(
      'INVOICE_INVALID_FIELD',
    )
  })

  it('rejects a non-numeric amount instead of treating it as zero', () => {
    expect(
      errorOf(() => normalizeInvoice(rawInvoice({ totalAmount: '1.100.000' }), NOW)).code,
    ).toBe('INVOICE_INVALID_FIELD')
    expect(
      errorOf(() => normalizeInvoice(rawInvoice({ items: [{ name: 'A', amount: 'abc' }] }), NOW))
        .code,
    ).toBe('INVOICE_INVALID_FIELD')
  })

  it('rejects an unparseable or future issue date', () => {
    expect(errorOf(() => normalizeInvoice(rawInvoice({ issuedAt: '15-06-2026' }), NOW)).code).toBe(
      'INVOICE_INVALID_FIELD',
    )
    expect(errorOf(() => normalizeInvoice(rawInvoice({ issuedAt: '2026-07-05' }), NOW)).code).toBe(
      'INVOICE_INVALID_FIELD',
    )
  })

  it('rejects an invoice with too many lines', () => {
    const items = Array.from({ length: 1001 }, () => ({ name: 'A', amount: '1' }))

    expect(errorOf(() => normalizeInvoice(rawInvoice({ items }), NOW)).code).toBe(
      'INVOICE_INVALID_FIELD',
    )
  })
})
