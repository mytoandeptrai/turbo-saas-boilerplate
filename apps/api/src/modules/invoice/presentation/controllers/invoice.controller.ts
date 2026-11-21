import {
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Request,
  Res,
  StreamableFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common'
import { FilesInterceptor } from '@nestjs/platform-express'
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { memoryStorage } from 'multer'

import {
  InvoiceService,
  MAX_BATCH_FILES,
} from '@/modules/invoice/application/services/invoice.service'
import {
  InvoiceFilterDto,
  InvoiceQueryDto,
  toInvoiceFilter,
} from '@/modules/invoice/presentation/dtos/invoice-query.dto'
import {
  InvoiceDetailResponseDto,
  InvoiceListResponseDto,
  InvoiceResponseDto,
  InvoiceStatsResponseDto,
  InvoiceUploadResponseDto,
} from '@/modules/invoice/presentation/dtos/invoice-response.dto'
import {
  ApiNotFoundResponse,
  ApiValidationFailedResponse,
} from '@/shared-kernel/infrastructure/decorators/api-problem-responses.decorator'

import type { Response } from 'express'

const MAX_FILE_SIZE = 2 * 1024 * 1024
// Tax data must not be served from a shared or stale HTTP cache; ETag revalidation still applies
const NO_CACHE = 'private, no-cache'
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

type AuthenticatedRequest = Express.Request & { user: { id: string } }

/** Multer reads the original name as latin1; browsers send it as UTF-8 */
function decodeFileName(name: string): string {
  return Buffer.from(name, 'latin1').toString('utf8')
}

@ApiTags('invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post('upload')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(
    FilesInterceptor('files', MAX_BATCH_FILES, {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE, files: MAX_BATCH_FILES },
    }),
  )
  @ApiOperation({ summary: 'Upload up to 50 e-invoice XML files (max 2MB each)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['files'],
      properties: { files: { type: 'array', items: { type: 'string', format: 'binary' } } },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Every file was stored',
    type: InvoiceUploadResponseDto,
  })
  @ApiResponse({
    status: 207,
    description: 'Some files were duplicated, invalid or unsupported (per-file details included)',
    type: InvoiceUploadResponseDto,
  })
  @ApiValidationFailedResponse('Empty batch or more than 50 files')
  async upload(
    @Request() req: AuthenticatedRequest,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<InvoiceUploadResponseDto> {
    const result = await this.invoiceService.uploadBatch(
      req.user.id,
      (files ?? []).map((file) => ({
        fileName: decodeFileName(file.originalname),
        content: file.buffer,
      })),
    )

    res.status(result.created === result.total ? HttpStatus.OK : HttpStatus.MULTI_STATUS)
    return InvoiceUploadResponseDto.from(result)
  }

  @Get()
  @Header('Cache-Control', NO_CACHE)
  @ApiOperation({ summary: 'List invoices (offset pagination with filters)' })
  @ApiResponse({ status: 200, type: InvoiceListResponseDto })
  async list(
    @Request() req: AuthenticatedRequest,
    @Query() query: InvoiceQueryDto,
  ): Promise<InvoiceListResponseDto> {
    const { data, total, page, pageSize } = await this.invoiceService.list(
      req.user.id,
      toInvoiceFilter(query),
      query.page ?? 1,
      query.pageSize ?? 20,
    )

    return {
      object: 'list',
      data: data.map((invoice) => InvoiceResponseDto.fromRecord(invoice)),
      page,
      pageSize,
      total,
      hasMore: page * pageSize < total,
    }
  }

  // Static routes must stay above ':id'
  @Get('stats')
  @Header('Cache-Control', NO_CACHE)
  @ApiOperation({ summary: 'Invoice totals for the summary cards' })
  @ApiResponse({ status: 200, type: InvoiceStatsResponseDto })
  async stats(
    @Request() req: AuthenticatedRequest,
    @Query() query: InvoiceFilterDto,
  ): Promise<InvoiceStatsResponseDto> {
    const stats = await this.invoiceService.getStats(req.user.id, toInvoiceFilter(query))
    return InvoiceStatsResponseDto.from(stats)
  }

  @Get('export')
  @ApiOperation({ summary: 'Export filtered invoices to Excel (max 5000 invoices)' })
  @ApiProduces(XLSX_MIME)
  @ApiResponse({
    status: 200,
    description: 'Excel workbook',
    content: { [XLSX_MIME]: { schema: { type: 'string', format: 'binary' } } },
  })
  @ApiValidationFailedResponse('More than 5000 invoices match the filter')
  async export(
    @Request() req: AuthenticatedRequest,
    @Query() query: InvoiceFilterDto,
  ): Promise<StreamableFile> {
    const workbook = await this.invoiceService.exportExcel(req.user.id, toInvoiceFilter(query))
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '')

    return new StreamableFile(workbook, {
      type: XLSX_MIME,
      disposition: `attachment; filename="hoa-don-${date}.xlsx"`,
      length: workbook.length,
    })
  }

  @Get(':id')
  @Header('Cache-Control', NO_CACHE)
  @ApiOperation({ summary: 'Get invoice details with line items' })
  @ApiParam({ name: 'id', description: 'Invoice ID', format: 'uuid' })
  @ApiResponse({ status: 200, type: InvoiceDetailResponseDto })
  @ApiNotFoundResponse('Invoice not found')
  async findOne(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InvoiceDetailResponseDto> {
    const invoice = await this.invoiceService.getById(req.user.id, id)
    return InvoiceDetailResponseDto.fromRecordWithItems(invoice)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an invoice' })
  @ApiParam({ name: 'id', description: 'Invoice ID', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Invoice deleted' })
  @ApiNotFoundResponse('Invoice not found')
  async remove(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.invoiceService.delete(req.user.id, id)
  }
}
