import { createHash } from 'node:crypto'

import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'

import { INVOICE_EXCEL_EXPORTER } from '@/modules/invoice/application/ports/invoice-excel-exporter.port'
import { INVOICE_XML_PARSER } from '@/modules/invoice/application/ports/invoice-xml-parser.port'
import { INVOICE_REPOSITORY } from '@/modules/invoice/application/ports/invoice.repository.port'
import { InvoiceParseError } from '@/modules/invoice/domain/invoice-parse.error'
import { reconcileInvoice } from '@/modules/invoice/domain/invoice-reconciliation'
import { ErrorCode } from '@/shared-kernel/infrastructure/enums/error-code'

import type { InvoiceExcelExporter } from '@/modules/invoice/application/ports/invoice-excel-exporter.port'
import type { InvoiceXmlParser } from '@/modules/invoice/application/ports/invoice-xml-parser.port'
import type {
  InvoiceFilter,
  InvoiceRepository,
  InvoiceStats,
} from '@/modules/invoice/application/ports/invoice.repository.port'
import type {
  InvoiceRecord,
  InvoiceStatus,
  InvoiceWithItems,
} from '@/modules/invoice/domain/invoice.types'

export const MAX_BATCH_FILES = 50
export const MAX_EXPORT_INVOICES = 5000

export interface UploadedInvoiceFile {
  fileName: string
  content: Buffer
}

export type UploadOutcome = 'CREATED' | 'DUPLICATE' | 'INVALID' | 'UNSUPPORTED'

export interface UploadFileResult {
  fileName: string
  outcome: UploadOutcome
  invoiceId?: string
  invoiceNumber?: string
  status?: InvoiceStatus
  code?: string
  message?: string
}

export interface UploadBatchResult {
  total: number
  created: number
  duplicated: number
  failed: number
  results: UploadFileResult[]
}

type FileKind = 'xml' | 'pdf' | 'unknown'

const UTF8_BOM = Buffer.from('\uFEFF', 'utf8')

/** Sniffs the content; the client-supplied MIME type and extension are not trusted. */
function detectFileKind(content: Buffer): FileKind {
  const body = content.subarray(0, 3).equals(UTF8_BOM) ? content.subarray(3) : content
  const head = body.subarray(0, 64).toString('latin1').trimStart()
  if (head.startsWith('%PDF-')) return 'pdf'
  if (head.startsWith('<')) return 'xml'
  return 'unknown'
}

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name)

  constructor(
    @Inject(INVOICE_REPOSITORY)
    private readonly invoiceRepository: InvoiceRepository,
    @Inject(INVOICE_XML_PARSER)
    private readonly xmlParser: InvoiceXmlParser,
    @Inject(INVOICE_EXCEL_EXPORTER)
    private readonly excelExporter: InvoiceExcelExporter,
  ) {}

  /**
   * Imports a batch of invoice files. Each file is handled independently:
   * one broken file never fails the batch.
   */
  async uploadBatch(ownerId: string, files: UploadedInvoiceFile[]): Promise<UploadBatchResult> {
    if (files.length === 0) {
      throw new UnprocessableEntityException({
        code: ErrorCode.INVOICE_BATCH_EMPTY,
        message: 'Vui lòng chọn ít nhất một file hóa đơn',
      })
    }
    if (files.length > MAX_BATCH_FILES) {
      throw new UnprocessableEntityException({
        code: ErrorCode.INVOICE_BATCH_TOO_LARGE,
        message: `Mỗi lần chỉ được tải lên tối đa ${MAX_BATCH_FILES} file`,
      })
    }

    const results: UploadFileResult[] = []
    // Sequential on purpose: two copies in one batch must yield CREATED then DUPLICATE
    for (const file of files) {
      // oxlint-disable-next-line no-await-in-loop
      results.push(await this.importFile(ownerId, file))
    }

    const created = results.filter((result) => result.outcome === 'CREATED').length
    const duplicated = results.filter((result) => result.outcome === 'DUPLICATE').length

    return {
      total: results.length,
      created,
      duplicated,
      failed: results.length - created - duplicated,
      results,
    }
  }

  private async importFile(ownerId: string, file: UploadedInvoiceFile): Promise<UploadFileResult> {
    const { fileName, content } = file
    const kind = detectFileKind(content)

    if (kind === 'pdf') {
      return {
        fileName,
        outcome: 'UNSUPPORTED',
        code: ErrorCode.INVOICE_PDF_NOT_SUPPORTED,
        message: 'Chưa hỗ trợ đọc file PDF, vui lòng tải lên file XML của hóa đơn',
      }
    }
    if (kind === 'unknown') {
      return {
        fileName,
        outcome: 'UNSUPPORTED',
        code: ErrorCode.INVOICE_UNSUPPORTED_FILE,
        message: 'Định dạng file không được hỗ trợ, chỉ nhận file XML hóa đơn điện tử',
      }
    }

    try {
      const invoice = this.xmlParser.parse(content)
      const { status, issues } = reconcileInvoice(invoice)

      const record = await this.invoiceRepository.create({
        ownerId,
        invoice,
        status,
        validationIssues: issues,
        sourceFileName: fileName,
        sourceFileHash: createHash('sha256').update(content).digest('hex'),
      })

      if (!record) {
        return {
          fileName,
          outcome: 'DUPLICATE',
          invoiceNumber: invoice.invoiceNumber,
          code: ErrorCode.INVOICE_DUPLICATE,
          message: 'Hóa đơn đã tồn tại trong hệ thống',
        }
      }

      return {
        fileName,
        outcome: 'CREATED',
        invoiceId: record.id,
        invoiceNumber: record.invoiceNumber,
        status: record.status,
      }
    } catch (error) {
      if (error instanceof InvoiceParseError) {
        return { fileName, outcome: 'INVALID', code: error.code, message: error.message }
      }
      // Never log invoice content or tax codes
      this.logger.error(
        `Invoice import failed: ${error instanceof Error ? error.name : 'unknown error'}`,
      )
      return {
        fileName,
        outcome: 'INVALID',
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Không thể lưu hóa đơn, vui lòng thử lại',
      }
    }
  }

  async list(
    ownerId: string,
    filter: InvoiceFilter,
    page: number,
    pageSize: number,
  ): Promise<{ data: InvoiceRecord[]; total: number; page: number; pageSize: number }> {
    const { data, total } = await this.invoiceRepository.findPage(ownerId, filter, page, pageSize)
    return { data, total, page, pageSize }
  }

  async getById(ownerId: string, id: string): Promise<InvoiceWithItems> {
    const invoice = await this.invoiceRepository.findByIdWithItems(ownerId, id)
    if (!invoice) throw this.notFound()
    return invoice
  }

  async getStats(ownerId: string, filter: InvoiceFilter): Promise<InvoiceStats> {
    return this.invoiceRepository.getStats(ownerId, filter)
  }

  async exportExcel(ownerId: string, filter: InvoiceFilter): Promise<Buffer> {
    const total = await this.invoiceRepository.count(ownerId, filter)
    if (total > MAX_EXPORT_INVOICES) {
      throw new UnprocessableEntityException({
        code: ErrorCode.INVOICE_EXPORT_TOO_LARGE,
        message: `Chỉ xuất được tối đa ${MAX_EXPORT_INVOICES} hóa đơn mỗi lần, vui lòng thu hẹp bộ lọc`,
      })
    }

    const invoices = await this.invoiceRepository.findAllWithItems(
      ownerId,
      filter,
      MAX_EXPORT_INVOICES,
    )
    return this.excelExporter.export(invoices)
  }

  async delete(ownerId: string, id: string): Promise<void> {
    const deleted = await this.invoiceRepository.delete(ownerId, id)
    if (!deleted) throw this.notFound()
  }

  // 404 rather than 403 so the existence of other owners' invoices is not revealed
  private notFound(): NotFoundException {
    return new NotFoundException({
      code: ErrorCode.INVOICE_NOT_FOUND,
      message: 'Không tìm thấy hóa đơn',
    })
  }
}
