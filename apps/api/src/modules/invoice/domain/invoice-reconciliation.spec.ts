import { describe, expect, it } from 'vitest'

import { reconcileInvoice } from '@/modules/invoice/domain/invoice-reconciliation'

import type { ParsedInvoice, ParsedInvoiceItem } from '@/modules/invoice/domain/invoice.types'

function item(overrides: Partial<ParsedInvoiceItem> = {}): ParsedInvoiceItem {
  return {
    kind: 'GOODS',
    lineNumber: 1,
    code: null,
    name: 'Gạo ST25',
    unit: 'kg',
    quantity: '10.000000',
    unitPrice: '100000.000000',
    discountAmount: '0.00',
    amount: '1000000.00',
    vatRate: '10%',
    vatAmount: '100000.00',
    ...overrides,
  }
}

function invoice(overrides: Partial<ParsedInvoice> = {}): ParsedInvoice {
  return {
    provider: 'TCT',
    invoiceTemplate: '1',
    invoiceSeries: 'C26TAA',
    invoiceNumber: '00000123',
    issuedAt: '2026-06-15',
    currency: 'VND',
    exchangeRate: '1.000000',
    sellerTaxCode: '0101234567',
    sellerName: 'Công ty A',
    sellerAddress: null,
    buyerTaxCode: null,
    buyerName: null,
    buyerAddress: null,
    subtotalAmount: '1000000.00',
    vatAmount: '100000.00',
    totalAmount: '1100000.00',
    items: [item()],
    ...overrides,
  }
}

const codes = (target: ParsedInvoice) => reconcileInvoice(target).issues.map((issue) => issue.code)

describe('reconcileInvoice', () => {
  it('accepts an invoice whose amounts add up', () => {
    expect(reconcileInvoice(invoice())).toEqual({ status: 'VALID', issues: [] })
  })

  it('flags subtotal + VAT != total', () => {
    const result = reconcileInvoice(invoice({ totalAmount: '1200000.00' }))

    expect(result.status).toBe('MISMATCH')
    expect(result.issues).toEqual([
      expect.objectContaining({ code: 'TOTAL_MISMATCH', severity: 'error' }),
    ])
    expect(result.issues[0]!.message).toContain('1200000.00')
  })

  it('reconciles even when VAT is zero', () => {
    expect(codes(invoice({ vatAmount: '0.00', items: [item({ vatAmount: '0.00' })] }))).toEqual([
      'TOTAL_MISMATCH',
    ])
  })

  it('flags line amounts that do not add up to the subtotal', () => {
    const target = invoice({ items: [item({ amount: '900000.00', quantity: '9.000000' })] })

    expect(codes(target)).toEqual(['SUBTOTAL_MISMATCH'])
    expect(reconcileInvoice(target).status).toBe('MISMATCH')
  })

  it('flags line VAT that does not add up to the VAT total', () => {
    expect(codes(invoice({ items: [item({ vatAmount: '80000.00' })] }))).toEqual(['VAT_MISMATCH'])
  })

  it('skips the VAT sum when a line has no VAT amount', () => {
    expect(codes(invoice({ items: [item({ vatAmount: null })] }))).toEqual([])
  })

  it('tolerates one unit of rounding per line', () => {
    const items = [
      item({ lineNumber: 1, amount: '333333.00', quantity: null, vatAmount: '33333.00' }),
      item({ lineNumber: 2, amount: '333333.00', quantity: null, vatAmount: '33333.00' }),
      item({ lineNumber: 3, amount: '333333.00', quantity: null, vatAmount: '33333.00' }),
    ]

    expect(reconcileInvoice(invoice({ items })).status).toBe('VALID')
  })

  it('subtracts discount lines and ignores note lines', () => {
    const items = [
      item({ amount: '1100000.00', quantity: '11.000000', vatAmount: '110000.00' }),
      item({ kind: 'DISCOUNT', lineNumber: 2, amount: '100000.00', vatAmount: '10000.00' }),
      item({ kind: 'NOTE', lineNumber: 3, amount: '999.00', vatAmount: null }),
    ]

    expect(reconcileInvoice(invoice({ items })).status).toBe('VALID')
  })

  it('reports quantity x unit price inconsistencies as warnings only', () => {
    const result = reconcileInvoice(invoice({ items: [item({ unitPrice: '90000.000000' })] }))

    expect(result.status).toBe('VALID')
    expect(result.issues).toEqual([
      expect.objectContaining({ code: 'LINE_AMOUNT_MISMATCH', severity: 'warning' }),
    ])
  })

  it('accepts a sales invoice without VAT', () => {
    const target = invoice({
      subtotalAmount: '1000000.00',
      vatAmount: '0.00',
      totalAmount: '1000000.00',
      items: [item({ vatRate: null, vatAmount: null })],
    })

    expect(reconcileInvoice(target)).toEqual({ status: 'VALID', issues: [] })
  })

  it('reconciles negative adjustment invoices', () => {
    const target = invoice({
      subtotalAmount: '-1000000.00',
      vatAmount: '-100000.00',
      totalAmount: '-1100000.00',
      items: [item({ quantity: '-10.000000', amount: '-1000000.00', vatAmount: '-100000.00' })],
    })

    expect(reconcileInvoice(target).status).toBe('VALID')
  })
})
