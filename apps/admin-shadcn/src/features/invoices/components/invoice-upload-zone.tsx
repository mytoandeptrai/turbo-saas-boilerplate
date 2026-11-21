'use client'

import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Loader2Icon, UploadCloudIcon, XIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

import { useInvoiceUpload } from '@/features/invoices/hooks/use-invoice-upload'
import { OUTCOME_LABELS } from '@/features/invoices/lib/labels'

import type { UploadFileResult, UploadResult } from '@/features/invoices/lib/labels'
import type { ChangeEvent, DragEvent } from 'react'

const MAX_FILES = 50
const MAX_SIZE_MB = 2

function OutcomeBadge({ outcome }: { outcome: UploadFileResult['outcome'] }) {
  if (outcome === 'CREATED') {
    return (
      <Badge variant="outline" className="border-green-600 text-green-600">
        {OUTCOME_LABELS.CREATED}
      </Badge>
    )
  }
  if (outcome === 'DUPLICATE') return <Badge variant="secondary">{OUTCOME_LABELS.DUPLICATE}</Badge>
  return <Badge variant="destructive">{OUTCOME_LABELS[outcome]}</Badge>
}

export function InvoiceUploadZone() {
  const [isDragging, setIsDragging] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const upload = useInvoiceUpload(setResult)

  function submit(fileList: FileList | null) {
    if (!fileList || fileList.length === 0 || upload.isPending) return
    const files = [...fileList]

    if (files.length > MAX_FILES) {
      toast.error(`Chỉ được tải lên tối đa ${MAX_FILES} tệp mỗi lần`)
      return
    }
    const oversized = files.find((file) => file.size > MAX_SIZE_MB * 1024 * 1024)
    if (oversized) {
      toast.error(`${oversized.name} vượt quá ${MAX_SIZE_MB}MB`)
      return
    }

    setResult(null)
    upload.mutate(files)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    submit(event.dataTransfer.files)
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    submit(event.target.files)
    event.target.value = ''
  }

  // Rows that need attention come first
  const notCreated = result?.results.filter((entry) => entry.outcome !== 'CREATED') ?? []

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        aria-label="Tải lên hóa đơn điện tử"
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:bg-muted/50'
        }`}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {upload.isPending ? (
          <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
        ) : (
          <UploadCloudIcon className="size-8 text-muted-foreground" />
        )}
        <p className="text-sm font-medium">
          {upload.isPending
            ? 'Đang xử lý hóa đơn…'
            : 'Kéo thả tệp hóa đơn vào đây hoặc bấm để chọn tệp'}
        </p>
        <p className="text-xs text-muted-foreground">
          Hỗ trợ XML hóa đơn điện tử (TCT, VNPT, MISA, Viettel, FPT) · tối đa {MAX_FILES} tệp,{' '}
          {MAX_SIZE_MB}MB mỗi tệp · PDF chưa được hỗ trợ đọc tự động
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".xml,.pdf,text/xml,application/xml,application/pdf"
          className="hidden"
          data-testid="invoice-file-input"
          onChange={handleChange}
        />
      </div>

      {result && (
        <div className="rounded-lg border p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium">
              Kết quả tải lên: {result.created} đã lưu · {result.duplicated} trùng lặp ·{' '}
              {result.failed} lỗi (tổng {result.total} tệp)
            </p>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Đóng kết quả tải lên"
              onClick={() => setResult(null)}
            >
              <XIcon />
            </Button>
          </div>
          {notCreated.length > 0 && (
            <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
              {notCreated.map((entry, index) => (
                // eslint-disable-next-line @eslint-react/no-array-index-key -- the same file name can repeat in one batch
                <li key={`${entry.fileName}-${index}`} className="flex items-start gap-2 text-sm">
                  <OutcomeBadge outcome={entry.outcome} />
                  <span className="min-w-0">
                    <span className="font-medium break-all">{entry.fileName}</span>
                    {entry.message && (
                      <span className="text-muted-foreground"> — {entry.message}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
