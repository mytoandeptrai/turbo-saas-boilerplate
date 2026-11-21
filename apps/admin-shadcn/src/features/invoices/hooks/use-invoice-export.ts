'use client'

import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { apiClient } from '@/lib/api'
import { ApiClientError } from '@/lib/api-error'

import type { paths } from '@workspace/api-types'

type ExportQuery = NonNullable<paths['/api/invoices/export']['get']['parameters']['query']>

const FILE_NAME = /filename="?([^";]+)"?/

export function useInvoiceExport() {
  return useMutation({
    mutationFn: async (query: ExportQuery) => {
      const { data, response } = await apiClient.GET('/api/invoices/export', {
        params: { query },
        parseAs: 'blob',
      })
      if (!data) throw new ApiClientError({ title: 'Không nhận được phản hồi', status: 0 })

      const fileName =
        FILE_NAME.exec(response.headers.get('content-disposition') ?? '')?.[1] ?? 'hoa-don.xlsx'
      const url = URL.createObjectURL(data as unknown as Blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      link.click()
      URL.revokeObjectURL(url)
    },
    onSuccess: () => toast.success('Đã xuất file Excel'),
    onError: (error) => {
      toast.error(
        error instanceof ApiClientError && error.status !== 0
          ? error.userMessage
          : 'Xuất Excel thất bại. Vui lòng thử lại.',
      )
    },
  })
}
