import { http, HttpResponse } from 'msw'

import type { components } from '@workspace/api-types'

type InvoiceResponseDto = components['schemas']['InvoiceResponseDto']
type InvoiceListResponseDto = components['schemas']['InvoiceListResponseDto']
type InvoiceStatsResponseDto = components['schemas']['InvoiceStatsResponseDto']
type InvoiceDetailResponseDto = components['schemas']['InvoiceDetailResponseDto']
type InvoiceUploadResponseDto = components['schemas']['InvoiceUploadResponseDto']

const API = 'http://localhost:3000/api/invoices'

export const mockInvoices: InvoiceResponseDto[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    provider: 'TCT',
    status: 'VALID',
    invoiceTemplate: '1',
    invoiceSeries: 'C26TAA',
    invoiceNumber: '00000123',
    issuedAt: '2026-03-12',
    currency: 'VND',
    sellerTaxCode: '0312345678',
    sellerName: 'CÔNG TY TNHH THỰC PHẨM VIỆT',
    sellerAddress: '12 Nguyễn Văn Linh, Quận 7, TP. Hồ Chí Minh',
    buyerTaxCode: '8123456789001',
    buyerName: 'HỘ KINH DOANH TẠP HÓA CÔ BA',
    buyerAddress: '45 Lê Lợi, Quận 1, TP. Hồ Chí Minh',
    subtotalAmount: '5100000.00',
    vatAmount: '300000.00',
    totalAmount: '5400000.00',
    validationIssues: [],
    sourceFileName: 'hoa-don-123.xml',
    createdAt: '2026-03-13T02:00:00.000Z',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    provider: 'VNPT',
    status: 'MISMATCH',
    invoiceTemplate: '1',
    invoiceSeries: 'C26TBB',
    invoiceNumber: '00000456',
    issuedAt: '2026-01-05',
    currency: 'VND',
    sellerTaxCode: '0101234567',
    sellerName: 'CÔNG TY CỔ PHẦN BAO BÌ HÀ NỘI',
    sellerAddress: null,
    buyerTaxCode: null,
    buyerName: null,
    buyerAddress: null,
    subtotalAmount: '1000000.00',
    vatAmount: '100000.00',
    totalAmount: '1200000.00',
    validationIssues: [
      {
        code: 'TOTAL_MISMATCH',
        severity: 'error',
        message: 'Tiền hàng + thuế GTGT không khớp tổng thanh toán',
      },
    ],
    sourceFileName: 'hoa-don-456.xml',
    createdAt: '2026-01-06T02:00:00.000Z',
  },
]

export const invoiceHandlers = [
  http.get(API, ({ request }) => {
    const status = new URL(request.url).searchParams.get('status')
    const data = status ? mockInvoices.filter((invoice) => invoice.status === status) : mockInvoices
    return HttpResponse.json<InvoiceListResponseDto>({
      object: 'list',
      data,
      page: 1,
      pageSize: 20,
      total: data.length,
      hasMore: false,
    })
  }),

  http.get(`${API}/stats`, () =>
    HttpResponse.json<InvoiceStatsResponseDto>({
      totalInvoices: 2,
      validCount: 1,
      mismatchCount: 1,
      subtotalAmount: '6100000.00',
      vatAmount: '400000.00',
      totalAmount: '6600000.00',
    }),
  ),

  http.post(`${API}/upload`, async ({ request }) => {
    const files = (await request.formData()).getAll('files') as File[]
    return HttpResponse.json<InvoiceUploadResponseDto>(
      {
        total: files.length,
        created: 0,
        duplicated: files.length,
        failed: 0,
        results: files.map((file) => ({
          fileName: file.name,
          outcome: 'DUPLICATE',
          code: 'INVOICE_DUPLICATE',
          message: 'Hóa đơn đã tồn tại trong hệ thống',
        })),
      },
      { status: 207 },
    )
  }),

  http.get(`${API}/:id`, ({ params }) => {
    const invoice = mockInvoices.find((entry) => entry.id === params.id)
    if (!invoice) return HttpResponse.json({ title: 'Not Found', status: 404 }, { status: 404 })
    return HttpResponse.json<InvoiceDetailResponseDto>({
      ...invoice,
      items: [
        {
          id: '33333333-3333-4333-8333-333333333333',
          kind: 'GOODS',
          lineNumber: 1,
          code: 'GAO-ST25',
          name: 'Gạo ST25 túi 5kg',
          unit: 'Túi',
          quantity: '20',
          unitPrice: '180000',
          discountAmount: '0.00',
          amount: '3600000.00',
          vatRate: '5%',
          vatAmount: '180000.00',
        },
      ],
    })
  }),
]
