import { ZERO, formatDecimal, multiply, parseDecimal } from '@/modules/invoice/domain/decimal'
import { InvoiceParseError } from '@/modules/invoice/domain/invoice-parse.error'

import type { Decimal } from '@/modules/invoice/domain/decimal'
import type {
  InvoiceItemKind,
  ParsedInvoice,
  ParsedInvoiceItem,
  RawInvoice,
  RawInvoiceItem,
} from '@/modules/invoice/domain/invoice.types'

export const MAX_INVOICE_ITEMS = 1000

const TAX_CODE_PATTERN = /^(\d{10})(?:-?(\d{3}))?$/
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/
const VN_DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})(?: .*)?$/
const DAY_MS = 24 * 60 * 60 * 1000

const ITEM_KINDS: Record<string, InvoiceItemKind> = {
  '1': 'GOODS',
  '2': 'PROMOTION',
  '3': 'DISCOUNT',
  '4': 'NOTE',
}

function clean(value: string | undefined, maxLength?: number): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  return maxLength ? trimmed.slice(0, maxLength) : trimmed
}

function required(value: string | undefined, label: string, maxLength?: number): string {
  const cleaned = clean(value, maxLength)
  if (cleaned === null) {
    throw new InvoiceParseError('INVOICE_MISSING_FIELD', `Thiếu thông tin bắt buộc: ${label}`)
  }
  return cleaned
}

function optionalAmount(value: string | undefined, label: string): Decimal | null {
  if (clean(value) === null) return null
  const parsed = parseDecimal(value)
  if (parsed === null) {
    throw new InvoiceParseError('INVOICE_INVALID_FIELD', `${label} không phải là số hợp lệ`)
  }
  return parsed
}

/** Accepts YYYY-MM-DD and DD/MM/YYYY, optionally followed by a time. Returns YYYY-MM-DD. */
export function parseInvoiceDate(value: string): string | null {
  const input = value.trim()
  const iso = ISO_DATE_PATTERN.exec(input)
  const vn = VN_DATE_PATTERN.exec(input)
  const parts = iso ? [iso[1], iso[2], iso[3]] : vn ? [vn[3], vn[2], vn[1]] : null
  if (!parts) return null

  const [year, month, day] = parts.map(Number) as [number, number, number]
  const date = new Date(Date.UTC(year, month - 1, day))
  const isRealDate =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  return isRealDate ? date.toISOString().slice(0, 10) : null
}

/** 10-digit tax code, or 13 digits for dependent units. Returns the digits only. */
export function normalizeTaxCode(value: string): string | null {
  const match = TAX_CODE_PATTERN.exec(value.replaceAll(/\s/g, ''))
  if (!match) return null
  return `${match[1]}${match[2] ?? ''}`
}

/** "10" and "10%" both become "10%"; non-numeric rates (KCT, KKKNT) are kept verbatim. */
export function normalizeVatRate(value: string | undefined): string | null {
  const cleaned = clean(value, 10)
  if (cleaned === null) return null
  const numeric = cleaned.endsWith('%') ? cleaned.slice(0, -1).trim() : cleaned
  return parseDecimal(numeric) === null ? cleaned.toUpperCase() : `${numeric}%`
}

function normalizeItem(raw: RawInvoiceItem, index: number): ParsedInvoiceItem {
  const label = `Dòng hàng ${index + 1}`
  const kind = ITEM_KINDS[raw.kind?.trim() ?? ''] ?? 'GOODS'
  const quantity = optionalAmount(raw.quantity, `${label}: số lượng`)
  const unitPrice = optionalAmount(raw.unitPrice, `${label}: đơn giá`)
  const discountRate = optionalAmount(raw.discountRate, `${label}: tỷ lệ chiết khấu`)
  let discountAmount = optionalAmount(raw.discountAmount, `${label}: tiền chiết khấu`)
  if (discountAmount === null && discountRate !== null && quantity !== null && unitPrice !== null) {
    discountAmount = multiply(multiply(quantity, unitPrice), discountRate) / 100n
  }
  const amount = optionalAmount(raw.amount, `${label}: thành tiền`)
  const vatAmount = optionalAmount(raw.vatAmount, `${label}: tiền thuế`)
  const lineNumber = Number.parseInt(raw.lineNumber ?? '', 10)

  return {
    kind,
    lineNumber: Number.isSafeInteger(lineNumber) && lineNumber > 0 ? lineNumber : index + 1,
    code: clean(raw.code, 50),
    name: clean(raw.name, 500) ?? '',
    unit: clean(raw.unit, 50),
    quantity: quantity === null ? null : formatDecimal(quantity, 6),
    unitPrice: unitPrice === null ? null : formatDecimal(unitPrice, 6),
    discountAmount: formatDecimal(discountAmount ?? ZERO),
    amount: formatDecimal(amount ?? ZERO),
    vatRate: normalizeVatRate(raw.vatRate),
    vatAmount: vatAmount === null ? null : formatDecimal(vatAmount),
  }
}

/**
 * Turns untrusted raw values into a normalised invoice.
 * Throws InvoiceParseError when a mandatory field is missing or unusable.
 */
export function normalizeInvoice(raw: RawInvoice, now: Date = new Date()): ParsedInvoice {
  const invoiceNumber = required(raw.invoiceNumber, 'số hóa đơn', 20)

  const issuedAt = parseInvoiceDate(required(raw.issuedAt, 'ngày lập'))
  if (issuedAt === null) {
    throw new InvoiceParseError('INVOICE_INVALID_FIELD', 'Ngày lập hóa đơn không hợp lệ')
  }
  if (new Date(issuedAt).getTime() > now.getTime() + DAY_MS) {
    throw new InvoiceParseError('INVOICE_INVALID_FIELD', 'Ngày lập hóa đơn nằm trong tương lai')
  }

  const sellerTaxCode = normalizeTaxCode(required(raw.sellerTaxCode, 'mã số thuế người bán'))
  if (sellerTaxCode === null) {
    throw new InvoiceParseError(
      'INVOICE_INVALID_FIELD',
      'Mã số thuế người bán phải gồm 10 hoặc 13 chữ số',
    )
  }

  const total = optionalAmount(
    required(raw.totalAmount, 'tổng tiền thanh toán'),
    'Tổng thanh toán',
  )!
  const rawVat = optionalAmount(raw.vatAmount, 'Tổng tiền thuế')
  const rawSubtotal = optionalAmount(raw.subtotalAmount, 'Tổng tiền chưa thuế')
  // Sales invoices issued by household businesses carry no tax tags
  const vat = rawVat ?? ZERO
  const subtotal = rawSubtotal ?? total - vat

  const exchangeRate = optionalAmount(raw.exchangeRate, 'Tỷ giá')

  if (raw.items.length > MAX_INVOICE_ITEMS) {
    throw new InvoiceParseError(
      'INVOICE_INVALID_FIELD',
      `Hóa đơn vượt quá ${MAX_INVOICE_ITEMS} dòng hàng`,
    )
  }

  const buyerTaxCode = clean(raw.buyerTaxCode)

  return {
    provider: raw.provider,
    invoiceTemplate: clean(raw.invoiceTemplate, 20) ?? '',
    invoiceSeries: clean(raw.invoiceSeries, 20) ?? '',
    invoiceNumber,
    issuedAt,
    currency: (clean(raw.currency, 3) ?? 'VND').toUpperCase(),
    exchangeRate: formatDecimal(exchangeRate ?? parseDecimal('1')!, 6),
    sellerTaxCode,
    sellerName: clean(raw.sellerName, 500) ?? '',
    sellerAddress: clean(raw.sellerAddress, 1000),
    buyerTaxCode:
      buyerTaxCode === null ? null : (normalizeTaxCode(buyerTaxCode) ?? buyerTaxCode.slice(0, 14)),
    buyerName: clean(raw.buyerName, 500),
    buyerAddress: clean(raw.buyerAddress, 1000),
    subtotalAmount: formatDecimal(subtotal),
    vatAmount: formatDecimal(vat),
    totalAmount: formatDecimal(total),
    items: raw.items.map((item, index) => normalizeItem(item, index)),
  }
}
