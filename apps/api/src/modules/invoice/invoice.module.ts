import { Module } from '@nestjs/common'

import { INVOICE_EXCEL_EXPORTER } from '@/modules/invoice/application/ports/invoice-excel-exporter.port'
import { INVOICE_XML_PARSER } from '@/modules/invoice/application/ports/invoice-xml-parser.port'
import { INVOICE_REPOSITORY } from '@/modules/invoice/application/ports/invoice.repository.port'
import { InvoiceService } from '@/modules/invoice/application/services/invoice.service'
import { ExcelJsInvoiceExporter } from '@/modules/invoice/infrastructure/adapters/exceljs-invoice-exporter'
import { FastXmlInvoiceParser } from '@/modules/invoice/infrastructure/adapters/xml/fast-xml-invoice-parser'
import { InvoiceRepositoryImpl } from '@/modules/invoice/infrastructure/repositories/invoice.repository'
import { InvoiceController } from '@/modules/invoice/presentation/controllers/invoice.controller'

/**
 * Invoice module — e-invoice import (XML), arithmetic reconciliation,
 * duplicate protection, listing, statistics and Excel export.
 */
@Module({
  controllers: [InvoiceController],
  providers: [
    InvoiceService,
    { provide: INVOICE_REPOSITORY, useClass: InvoiceRepositoryImpl },
    { provide: INVOICE_XML_PARSER, useClass: FastXmlInvoiceParser },
    { provide: INVOICE_EXCEL_EXPORTER, useClass: ExcelJsInvoiceExporter },
  ],
})
export class InvoiceModule {}
