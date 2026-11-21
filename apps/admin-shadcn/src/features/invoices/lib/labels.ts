import type { components } from '@workspace/api-types'

export type InvoiceRow = components['schemas']['InvoiceResponseDto']
export type InvoiceDetail = components['schemas']['InvoiceDetailResponseDto']
export type InvoiceStatus = InvoiceRow['status']
export type InvoiceProvider = InvoiceRow['provider']
export type UploadResult = components['schemas']['InvoiceUploadResponseDto']
export type UploadFileResult = components['schemas']['InvoiceUploadFileResultDto']

export const STATUS_LABELS: Record<InvoiceStatus, string> = {
  VALID: 'Hợp lệ',
  MISMATCH: 'Lệch tiền',
}

export const PROVIDER_LABELS: Record<InvoiceProvider, string> = {
  TCT: 'Chuẩn TCT',
  VNPT: 'VNPT',
  MISA: 'MISA',
  VIETTEL: 'Viettel',
  FPT: 'FPT',
}

export const ITEM_KIND_LABELS: Record<InvoiceDetail['items'][number]['kind'], string> = {
  GOODS: 'Hàng hóa, dịch vụ',
  PROMOTION: 'Khuyến mại',
  DISCOUNT: 'Chiết khấu',
  NOTE: 'Ghi chú',
}

export const OUTCOME_LABELS: Record<UploadFileResult['outcome'], string> = {
  CREATED: 'Đã lưu',
  DUPLICATE: 'Trùng lặp',
  INVALID: 'Không hợp lệ',
  UNSUPPORTED: 'Chưa hỗ trợ',
}
