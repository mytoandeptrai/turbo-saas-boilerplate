import { readFileSync } from 'node:fs'
import path from 'node:path'

import { NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { InvoiceService } from '@/modules/invoice/application/services/invoice.service'
import { FastXmlInvoiceParser } from '@/modules/invoice/infrastructure/adapters/xml/fast-xml-invoice-parser'

import type { InvoiceExcelExporter } from '@/modules/invoice/application/ports/invoice-excel-exporter.port'
import type {
  CreateInvoiceInput,
  InvoiceRepository,
} from '@/modules/invoice/application/ports/invoice.repository.port'
import type { InvoiceRecord, InvoiceWithItems } from '@/modules/invoice/domain/invoice.types'
import type { Mocked } from 'vitest'

const FIXTURES = path.resolve(import.meta.dirname, '../../../../../test/fixtures/invoices')
const file = (fileName: string, as = fileName) => ({
  fileName: as,
  content: readFileSync(path.join(FIXTURES, fileName)),
})

const OWNER = 'user-1'

/** In-memory stand-in honouring the 4-field identity like the database unique index */
function identityKey({ invoice }: CreateInvoiceInput): string {
  return [
    invoice.sellerTaxCode,
    invoice.invoiceTemplate,
    invoice.invoiceSeries,
    invoice.invoiceNumber,
  ].join('|')
}

describe('invoiceService', () => {
  let repository: Mocked<InvoiceRepository>
  let exporter: Mocked<InvoiceExcelExporter>
  let service: InvoiceService

  beforeEach(() => {
    const seen = new Set<string>()
    repository = {
      create: vi.fn(async (input: CreateInvoiceInput) => {
        const key = identityKey(input)
        if (seen.has(key)) return null
        seen.add(key)
        return {
          id: `inv-${seen.size}`,
          invoiceNumber: input.invoice.invoiceNumber,
          status: input.status,
        } as InvoiceRecord
      }),
      findPage: vi.fn(),
      findByIdWithItems: vi.fn(),
      count: vi.fn(),
      findAllWithItems: vi.fn(),
      getStats: vi.fn(),
      delete: vi.fn(),
    }
    exporter = { export: vi.fn() }
    // The real parser is pure and fast, so the service is exercised end to end
    service = new InvoiceService(repository, new FastXmlInvoiceParser(), exporter)
  })

  describe('uploadBatch', () => {
    it('stores a valid XML invoice as VALID', async () => {
      const result = await service.uploadBatch(OWNER, [file('tct-valid.xml')])

      expect(result).toMatchObject({ total: 1, created: 1, duplicated: 0, failed: 0 })
      expect(result.results[0]).toEqual({
        fileName: 'tct-valid.xml',
        outcome: 'CREATED',
        invoiceId: 'inv-1',
        invoiceNumber: '00000123',
        status: 'VALID',
      })
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerId: OWNER,
          status: 'VALID',
          validationIssues: [],
          sourceFileName: 'tct-valid.xml',
          sourceFileHash: expect.stringMatching(/^[0-9a-f]{64}$/),
        }),
      )
    })

    it('stores an invoice with mismatched amounts as MISMATCH with the reasons', async () => {
      const result = await service.uploadBatch(OWNER, [file('tct-amount-mismatch.xml')])

      expect(result.results[0]).toMatchObject({ outcome: 'CREATED', status: 'MISMATCH' })
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'MISMATCH',
          validationIssues: [expect.objectContaining({ code: 'TOTAL_MISMATCH' })],
        }),
      )
    })

    it('reports an already stored invoice as DUPLICATE without failing', async () => {
      await service.uploadBatch(OWNER, [file('tct-valid.xml')])

      const result = await service.uploadBatch(OWNER, [file('tct-valid.xml', 'copy.xml')])

      expect(result).toMatchObject({ total: 1, created: 0, duplicated: 1, failed: 0 })
      expect(result.results[0]).toMatchObject({
        fileName: 'copy.xml',
        outcome: 'DUPLICATE',
        code: 'INVOICE_DUPLICATE',
        invoiceNumber: '00000123',
      })
    })

    it('detects duplicates inside the same batch deterministically', async () => {
      const result = await service.uploadBatch(OWNER, [
        file('tct-valid.xml', 'a.xml'),
        file('tct-valid.xml', 'b.xml'),
      ])

      expect(result.results.map((entry) => entry.outcome)).toEqual(['CREATED', 'DUPLICATE'])
    })

    it('keeps processing after a broken file', async () => {
      const result = await service.uploadBatch(OWNER, [
        file('malformed.xml'),
        file('unknown-format.xml'),
        file('missing-seller-tax-code.xml'),
        file('vnpt-valid.xml'),
      ])

      expect(result).toMatchObject({ total: 4, created: 1, duplicated: 0, failed: 3 })
      expect(result.results.map((entry) => [entry.outcome, entry.code])).toEqual([
        ['INVALID', 'INVOICE_XML_MALFORMED'],
        ['INVALID', 'INVOICE_UNKNOWN_FORMAT'],
        ['INVALID', 'INVOICE_MISSING_FIELD'],
        ['CREATED', undefined],
      ])
    })

    it('reports PDF files as not supported yet', async () => {
      const pdf = { fileName: 'scan.xml', content: Buffer.from('%PDF-1.7\n...') }

      const result = await service.uploadBatch(OWNER, [pdf])

      expect(result.results[0]).toMatchObject({
        outcome: 'UNSUPPORTED',
        code: 'INVOICE_PDF_NOT_SUPPORTED',
      })
      expect(repository.create).not.toHaveBeenCalled()
    })

    it('sniffs content instead of trusting the file extension', async () => {
      const binary = { fileName: 'fake.xml', content: Buffer.from('PK\u0003\u0004binary') }

      const result = await service.uploadBatch(OWNER, [binary])

      expect(result.results[0]).toMatchObject({
        outcome: 'UNSUPPORTED',
        code: 'INVOICE_UNSUPPORTED_FILE',
      })
    })

    it('reports a storage failure for that file only, without leaking details', async () => {
      repository.create.mockRejectedValueOnce(new Error('connection refused: secret-host'))

      const result = await service.uploadBatch(OWNER, [
        file('tct-valid.xml'),
        file('fpt-valid.xml'),
      ])

      expect(result.results[0]).toMatchObject({ outcome: 'INVALID', code: 'INTERNAL_SERVER_ERROR' })
      expect(result.results[0]!.message).not.toContain('secret-host')
      expect(result.results[1]!.outcome).toBe('CREATED')
    })

    it('rejects an empty batch', async () => {
      await expect(service.uploadBatch(OWNER, [])).rejects.toMatchObject({
        constructor: UnprocessableEntityException,
        response: { code: 'INVOICE_BATCH_EMPTY' },
      })
    })

    it('rejects more than 50 files', async () => {
      const files = Array.from({ length: 51 }, (_, index) => file('tct-valid.xml', `${index}.xml`))

      await expect(service.uploadBatch(OWNER, files)).rejects.toMatchObject({
        response: { code: 'INVOICE_BATCH_TOO_LARGE' },
      })
      expect(repository.create).not.toHaveBeenCalled()
    })
  })

  describe('getById', () => {
    it('returns the invoice scoped to its owner', async () => {
      const invoice = { id: 'inv-1', items: [] } as unknown as InvoiceWithItems
      repository.findByIdWithItems.mockResolvedValue(invoice)

      await expect(service.getById(OWNER, 'inv-1')).resolves.toBe(invoice)
      expect(repository.findByIdWithItems).toHaveBeenCalledWith(OWNER, 'inv-1')
    })

    it('answers 404 for a missing or foreign invoice', async () => {
      repository.findByIdWithItems.mockResolvedValue(null)

      await expect(service.getById(OWNER, 'inv-x')).rejects.toMatchObject({
        constructor: NotFoundException,
        response: { code: 'INVOICE_NOT_FOUND' },
      })
    })
  })

  describe('list', () => {
    it('passes owner, filter and paging to the repository', async () => {
      repository.findPage.mockResolvedValue({ data: [], total: 0 })

      const result = await service.list(OWNER, { status: 'MISMATCH' }, 2, 10)

      expect(repository.findPage).toHaveBeenCalledWith(OWNER, { status: 'MISMATCH' }, 2, 10)
      expect(result).toEqual({ data: [], total: 0, page: 2, pageSize: 10 })
    })
  })

  describe('exportExcel', () => {
    it('exports the filtered invoices', async () => {
      const workbook = Buffer.from('xlsx')
      repository.count.mockResolvedValue(2)
      repository.findAllWithItems.mockResolvedValue([])
      exporter.export.mockResolvedValue(workbook)

      await expect(service.exportExcel(OWNER, { q: 'abc' })).resolves.toBe(workbook)
      expect(repository.findAllWithItems).toHaveBeenCalledWith(OWNER, { q: 'abc' }, 5000)
    })

    it('refuses to export more than 5000 invoices', async () => {
      repository.count.mockResolvedValue(5001)

      await expect(service.exportExcel(OWNER, {})).rejects.toMatchObject({
        response: { code: 'INVOICE_EXPORT_TOO_LARGE' },
      })
      expect(repository.findAllWithItems).not.toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('deletes an owned invoice', async () => {
      repository.delete.mockResolvedValue(true)

      await expect(service.delete(OWNER, 'inv-1')).resolves.toBeUndefined()
    })

    it('answers 404 when nothing was deleted', async () => {
      repository.delete.mockResolvedValue(false)

      await expect(service.delete(OWNER, 'inv-x')).rejects.toBeInstanceOf(NotFoundException)
    })
  })
})
