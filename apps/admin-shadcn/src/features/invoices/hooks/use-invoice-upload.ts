'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { apiClient } from '@/lib/api'
import { ApiClientError } from '@/lib/api-error'

import type { UploadResult } from '@/features/invoices/lib/labels'

/** Every invoice query key starts with the HTTP method and a path under /api/invoices */
function isInvoiceQuery(queryKey: readonly unknown[]): boolean {
  return typeof queryKey[1] === 'string' && queryKey[1].startsWith('/api/invoices')
}

export function useInvalidateInvoices() {
  const queryClient = useQueryClient()
  return () =>
    queryClient.invalidateQueries({ predicate: (query) => isInvoiceQuery(query.queryKey) })
}

export function useInvoiceUpload(onSettled?: (result: UploadResult) => void) {
  const invalidate = useInvalidateInvoices()

  return useMutation({
    mutationFn: async (files: File[]): Promise<UploadResult> => {
      const { data } = await apiClient.POST('/api/invoices/upload', {
        body: { files: [] },
        bodySerializer: () => {
          const formData = new FormData()
          for (const file of files) formData.append('files', file)
          return formData
        },
      })
      if (!data) throw new ApiClientError({ title: 'Không nhận được phản hồi', status: 0 })
      return data
    },
    onSuccess: async (result) => {
      if (result.created > 0) await invalidate()

      const summary = `Đã lưu ${result.created}/${result.total} hóa đơn`
      if (result.created === result.total) {
        toast.success(summary)
      } else {
        toast.warning(`${summary} · ${result.duplicated} trùng lặp · ${result.failed} lỗi`)
      }
      onSettled?.(result)
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiClientError && error.status !== 0
          ? error.userMessage
          : 'Tải lên thất bại. Vui lòng thử lại.',
      )
    },
  })
}
