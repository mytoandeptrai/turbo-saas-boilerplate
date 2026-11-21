import {
  ONE,
  abs,
  formatDecimal,
  multiply,
  parseDecimal,
  sum,
} from '@/modules/invoice/domain/decimal'

import type { Decimal } from '@/modules/invoice/domain/decimal'
import type {
  InvoiceStatus,
  ParsedInvoice,
  ValidationIssue,
} from '@/modules/invoice/domain/invoice.types'

export interface ReconciliationResult {
  status: InvoiceStatus
  issues: ValidationIssue[]
}

const toDecimal = (value: string): Decimal => parseDecimal(value) ?? 0n
const money = (value: Decimal): string => formatDecimal(value, 2)

/**
 * Arithmetic reconciliation of an invoice.
 *
 * Aggregate rules tolerate one currency unit per summed line because providers
 * round tax per line. Any `error` issue marks the invoice as MISMATCH.
 */
export function reconcileInvoice(invoice: ParsedInvoice): ReconciliationResult {
  const issues: ValidationIssue[] = []
  const subtotal = toDecimal(invoice.subtotalAmount)
  const vat = toDecimal(invoice.vatAmount)
  const total = toDecimal(invoice.totalAmount)

  if (abs(subtotal + vat - total) > ONE) {
    issues.push({
      code: 'TOTAL_MISMATCH',
      severity: 'error',
      message: `Tiền hàng (${money(subtotal)}) + thuế GTGT (${money(vat)}) = ${money(subtotal + vat)}, khác tổng thanh toán (${money(total)})`,
    })
  }

  const lines = invoice.items.filter((item) => item.kind !== 'NOTE')
  if (lines.length > 0) {
    const tolerance = ONE * BigInt(lines.length)

    const lineSubtotal = sum(
      lines.map((item) =>
        item.kind === 'DISCOUNT' ? -abs(toDecimal(item.amount)) : toDecimal(item.amount),
      ),
    )
    if (abs(lineSubtotal - subtotal) > tolerance) {
      issues.push({
        code: 'SUBTOTAL_MISMATCH',
        severity: 'error',
        message: `Tổng thành tiền các dòng hàng (${money(lineSubtotal)}) khác tổng tiền chưa thuế (${money(subtotal)})`,
      })
    }

    if (lines.every((item) => item.vatAmount !== null)) {
      const lineVat = sum(
        lines.map((item) =>
          item.kind === 'DISCOUNT' ? -abs(toDecimal(item.vatAmount!)) : toDecimal(item.vatAmount!),
        ),
      )
      if (abs(lineVat - vat) > tolerance) {
        issues.push({
          code: 'VAT_MISMATCH',
          severity: 'error',
          message: `Tổng tiền thuế các dòng hàng (${money(lineVat)}) khác tổng tiền thuế GTGT (${money(vat)})`,
        })
      }
    }
  }

  for (const item of invoice.items) {
    if (item.kind !== 'GOODS' || item.quantity === null || item.unitPrice === null) continue
    const expected =
      multiply(toDecimal(item.quantity), toDecimal(item.unitPrice)) - toDecimal(item.discountAmount)
    const actual = toDecimal(item.amount)
    if (abs(expected - actual) > ONE) {
      issues.push({
        code: 'LINE_AMOUNT_MISMATCH',
        severity: 'warning',
        message: `Dòng ${item.lineNumber}: số lượng × đơn giá − chiết khấu = ${money(expected)}, khác thành tiền (${money(actual)})`,
      })
    }
  }

  return {
    status: issues.some((issue) => issue.severity === 'error') ? 'MISMATCH' : 'VALID',
    issues,
  }
}
