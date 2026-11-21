import { Injectable } from '@nestjs/common'
import ExcelJS from 'exceljs'

import type { InvoiceExcelExporter } from '@/modules/invoice/application/ports/invoice-excel-exporter.port'
import type { InvoiceWithItems } from '@/modules/invoice/domain/invoice.types'
import type { Worksheet } from 'exceljs'

const STATUS_LABELS = { VALID: 'Hợp lệ', MISMATCH: 'Lệch tiền' } as const
const MONEY_FORMAT = '#,##0.##'
const DATE_FORMAT = 'dd/mm/yyyy'
const FORMULA_PREFIX = /^[=+\-@\t\r]/

/** Neutralises spreadsheet formula injection in text taken from uploaded files */
function safeText(value: string | null): string {
  if (!value) return ''
  return FORMULA_PREFIX.test(value) ? `'${value}` : value
}

function styleHeader(sheet: Worksheet): void {
  sheet.getRow(1).font = { bold: true }
  sheet.views = [{ state: 'frozen', ySplit: 1 }]
}

@Injectable()
export class ExcelJsInvoiceExporter implements InvoiceExcelExporter {
  async export(invoices: InvoiceWithItems[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook()

    const invoiceSheet = workbook.addWorksheet('Hóa đơn')
    invoiceSheet.columns = [
      { header: 'Mẫu số', key: 'template', width: 10 },
      { header: 'Ký hiệu', key: 'series', width: 12 },
      { header: 'Số hóa đơn', key: 'number', width: 14 },
      { header: 'Ngày lập', key: 'issuedAt', width: 12, style: { numFmt: DATE_FORMAT } },
      { header: 'MST người bán', key: 'sellerTaxCode', width: 16 },
      { header: 'Tên người bán', key: 'sellerName', width: 40 },
      { header: 'MST người mua', key: 'buyerTaxCode', width: 16 },
      { header: 'Tên người mua', key: 'buyerName', width: 40 },
      { header: 'Tiền hàng', key: 'subtotal', width: 16, style: { numFmt: MONEY_FORMAT } },
      { header: 'Thuế GTGT', key: 'vat', width: 16, style: { numFmt: MONEY_FORMAT } },
      { header: 'Tổng thanh toán', key: 'total', width: 18, style: { numFmt: MONEY_FORMAT } },
      { header: 'Tiền tệ', key: 'currency', width: 8 },
      { header: 'Trạng thái', key: 'status', width: 12 },
      { header: 'Ghi chú đối soát', key: 'issues', width: 60 },
    ]

    const itemSheet = workbook.addWorksheet('Chi tiết')
    itemSheet.columns = [
      { header: 'Ký hiệu', key: 'series', width: 12 },
      { header: 'Số hóa đơn', key: 'number', width: 14 },
      { header: 'Ngày lập', key: 'issuedAt', width: 12, style: { numFmt: DATE_FORMAT } },
      { header: 'MST người bán', key: 'sellerTaxCode', width: 16 },
      { header: 'STT', key: 'lineNumber', width: 6 },
      { header: 'Mã hàng', key: 'code', width: 14 },
      { header: 'Tên hàng hóa, dịch vụ', key: 'name', width: 40 },
      { header: 'ĐVT', key: 'unit', width: 10 },
      { header: 'Số lượng', key: 'quantity', width: 12, style: { numFmt: MONEY_FORMAT } },
      { header: 'Đơn giá', key: 'unitPrice', width: 16, style: { numFmt: MONEY_FORMAT } },
      { header: 'Chiết khấu', key: 'discount', width: 14, style: { numFmt: MONEY_FORMAT } },
      { header: 'Thành tiền', key: 'amount', width: 16, style: { numFmt: MONEY_FORMAT } },
      { header: 'Thuế suất', key: 'vatRate', width: 10 },
      { header: 'Tiền thuế', key: 'vatAmount', width: 16, style: { numFmt: MONEY_FORMAT } },
    ]

    for (const invoice of invoices) {
      invoiceSheet.addRow({
        template: safeText(invoice.invoiceTemplate),
        series: safeText(invoice.invoiceSeries),
        number: safeText(invoice.invoiceNumber),
        issuedAt: invoice.issuedAt,
        sellerTaxCode: invoice.sellerTaxCode,
        sellerName: safeText(invoice.sellerName),
        buyerTaxCode: safeText(invoice.buyerTaxCode),
        buyerName: safeText(invoice.buyerName),
        // Cells hold doubles; amounts up to 2^53 are represented exactly enough for display
        subtotal: Number(invoice.subtotalAmount),
        vat: Number(invoice.vatAmount),
        total: Number(invoice.totalAmount),
        currency: invoice.currency,
        status: STATUS_LABELS[invoice.status],
        issues: safeText(invoice.validationIssues.map((issue) => issue.message).join('; ')),
      })

      for (const item of invoice.items) {
        itemSheet.addRow({
          series: safeText(invoice.invoiceSeries),
          number: safeText(invoice.invoiceNumber),
          issuedAt: invoice.issuedAt,
          sellerTaxCode: invoice.sellerTaxCode,
          lineNumber: item.lineNumber,
          code: safeText(item.code),
          name: safeText(item.name),
          unit: safeText(item.unit),
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          discount: Number(item.discountAmount),
          amount: Number(item.amount),
          vatRate: safeText(item.vatRate),
          vatAmount: Number(item.vatAmount),
        })
      }
    }

    styleHeader(invoiceSheet)
    styleHeader(itemSheet)

    return Buffer.from(await workbook.xlsx.writeBuffer())
  }
}
