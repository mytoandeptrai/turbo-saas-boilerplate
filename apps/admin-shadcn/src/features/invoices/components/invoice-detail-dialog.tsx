'use client'

import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { Skeleton } from '@workspace/ui/components/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import { AlertTriangleIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'

import { InvoiceStatusBadge } from '@/features/invoices/components/invoice-status-badge'
import { useInvalidateInvoices } from '@/features/invoices/hooks/use-invoice-upload'
import { formatDate, formatMoney, formatNumber } from '@/features/invoices/lib/format'
import { ITEM_KIND_LABELS, PROVIDER_LABELS } from '@/features/invoices/lib/labels'
import { $api } from '@/lib/api'

import type { InvoiceDetail } from '@/features/invoices/lib/labels'

function Party({
  title,
  name,
  taxCode,
  address,
}: {
  title: string
  name: string | null
  taxCode: string | null
  address: string | null
}) {
  return (
    <div className="space-y-1 rounded-lg border p-3">
      <p className="text-xs font-medium text-muted-foreground uppercase">{title}</p>
      <p className="font-medium">{name ?? '—'}</p>
      <p className="text-sm">MST: {taxCode ?? '—'}</p>
      <p className="text-sm text-muted-foreground">{address ?? '—'}</p>
    </div>
  )
}

function InvoiceBody({ invoice }: { invoice: InvoiceDetail }) {
  return (
    <div className="space-y-4">
      {invoice.validationIssues.length > 0 && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <p className="flex items-center gap-2 font-medium text-destructive">
            <AlertTriangleIcon className="size-4" />
            Kết quả đối soát số học
          </p>
          <ul className="mt-2 list-disc space-y-1 ps-5">
            {invoice.validationIssues.map((issue) => (
              <li key={`${issue.code}-${issue.message}`}>{issue.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Party
          title="Người bán"
          name={invoice.sellerName}
          taxCode={invoice.sellerTaxCode}
          address={invoice.sellerAddress}
        />
        <Party
          title="Người mua"
          name={invoice.buyerName}
          taxCode={invoice.buyerTaxCode}
          address={invoice.buyerAddress}
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">STT</TableHead>
              <TableHead>Tên hàng hóa, dịch vụ</TableHead>
              <TableHead>ĐVT</TableHead>
              <TableHead className="text-right">Số lượng</TableHead>
              <TableHead className="text-right">Đơn giá</TableHead>
              <TableHead className="text-right">Thành tiền</TableHead>
              <TableHead className="text-right">Thuế suất</TableHead>
              <TableHead className="text-right">Tiền thuế</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.lineNumber}</TableCell>
                <TableCell className="whitespace-normal">
                  {item.name}
                  {item.kind !== 'GOODS' && (
                    <Badge variant="secondary" className="ms-2">
                      {ITEM_KIND_LABELS[item.kind]}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{item.unit ?? '—'}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatNumber(item.quantity)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatNumber(item.unitPrice)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatNumber(item.amount)}
                </TableCell>
                <TableCell className="text-right">{item.vatRate ?? '—'}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatNumber(item.vatAmount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <dl className="ms-auto grid w-full max-w-xs grid-cols-2 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Tiền hàng</dt>
        <dd className="text-right tabular-nums">
          {formatMoney(invoice.subtotalAmount, invoice.currency)}
        </dd>
        <dt className="text-muted-foreground">Thuế GTGT</dt>
        <dd className="text-right tabular-nums">
          {formatMoney(invoice.vatAmount, invoice.currency)}
        </dd>
        <dt className="font-medium">Tổng thanh toán</dt>
        <dd className="text-right font-semibold tabular-nums">
          {formatMoney(invoice.totalAmount, invoice.currency)}
        </dd>
      </dl>

      <p className="text-xs text-muted-foreground">
        Tệp nguồn: {invoice.sourceFileName} · Định dạng: {PROVIDER_LABELS[invoice.provider]} · Tải
        lên ngày {formatDate(invoice.createdAt)}
      </p>
    </div>
  )
}

interface InvoiceDetailDialogProps {
  invoiceId: string | null
  onClose: () => void
}

export function InvoiceDetailDialog({ invoiceId, onClose }: InvoiceDetailDialogProps) {
  const invalidate = useInvalidateInvoices()

  const { data: invoice, isLoading } = $api.useQuery(
    'get',
    '/api/invoices/{id}',
    { params: { path: { id: invoiceId ?? '' } } },
    { enabled: invoiceId !== null },
  )

  const remove = $api.useMutation('delete', '/api/invoices/{id}', {
    onSuccess: async () => {
      toast.success('Đã xóa hóa đơn')
      onClose()
      await invalidate()
    },
    onError: () => toast.error('Xóa hóa đơn thất bại. Vui lòng thử lại.'),
  })

  function handleDelete() {
    if (!invoiceId) return
    // eslint-disable-next-line no-alert -- a native confirm is enough for this destructive MVP action
    if (!globalThis.confirm('Xóa hóa đơn này khỏi danh sách? Bạn có thể tải lên lại sau.')) return
    remove.mutate({ params: { path: { id: invoiceId } } })
  }

  return (
    <Dialog open={invoiceId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {invoice ? `Hóa đơn số ${invoice.invoiceNumber}` : 'Chi tiết hóa đơn'}
            {invoice && <InvoiceStatusBadge status={invoice.status} />}
          </DialogTitle>
          <DialogDescription>
            {invoice
              ? `Ký hiệu ${invoice.invoiceTemplate}${invoice.invoiceSeries} · Ngày lập ${formatDate(invoice.issuedAt)}`
              : 'Đang tải thông tin hóa đơn…'}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !invoice ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <InvoiceBody invoice={invoice} />
        )}

        <DialogFooter>
          <Button
            variant="destructive"
            disabled={!invoice || remove.isPending}
            onClick={handleDelete}
          >
            <Trash2Icon />
            Xóa hóa đơn
          </Button>
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
