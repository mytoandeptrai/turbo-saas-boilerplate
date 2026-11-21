'use client'

import { DataTable } from '@/components/data-table/data-table'
import { InvoiceStatusBadge } from '@/features/invoices/components/invoice-status-badge'
import { formatDate, formatMoney } from '@/features/invoices/lib/format'
import { PROVIDER_LABELS } from '@/features/invoices/lib/labels'

import type { InvoiceRow } from '@/features/invoices/lib/labels'
import type { ColumnDef } from '@tanstack/react-table'

const columns: ColumnDef<InvoiceRow>[] = [
  {
    accessorKey: 'issuedAt',
    header: 'Ngày lập',
    cell: ({ row }) => formatDate(row.original.issuedAt),
  },
  {
    accessorKey: 'invoiceSeries',
    header: 'Ký hiệu',
    cell: ({ row }) => `${row.original.invoiceTemplate}${row.original.invoiceSeries}`,
  },
  {
    accessorKey: 'invoiceNumber',
    header: 'Số hóa đơn',
    cell: ({ row }) => <span className="font-medium">{row.original.invoiceNumber}</span>,
  },
  {
    accessorKey: 'sellerName',
    header: 'Người bán',
    cell: ({ row }) => (
      <div className="max-w-72">
        <p className="truncate" title={row.original.sellerName}>
          {row.original.sellerName}
        </p>
        <p className="text-xs text-muted-foreground">MST: {row.original.sellerTaxCode}</p>
      </div>
    ),
  },
  {
    accessorKey: 'subtotalAmount',
    header: () => <div className="text-right">Tiền hàng</div>,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">
        {formatMoney(row.original.subtotalAmount, row.original.currency)}
      </div>
    ),
  },
  {
    accessorKey: 'vatAmount',
    header: () => <div className="text-right">Thuế GTGT</div>,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">
        {formatMoney(row.original.vatAmount, row.original.currency)}
      </div>
    ),
  },
  {
    accessorKey: 'totalAmount',
    header: () => <div className="text-right">Tổng thanh toán</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium tabular-nums">
        {formatMoney(row.original.totalAmount, row.original.currency)}
      </div>
    ),
  },
  {
    accessorKey: 'provider',
    header: 'Nhà cung cấp',
    cell: ({ row }) => PROVIDER_LABELS[row.original.provider],
  },
  {
    accessorKey: 'status',
    header: 'Trạng thái',
    cell: ({ row }) => <InvoiceStatusBadge status={row.original.status} />,
  },
]

interface InvoicesTableProps {
  data: InvoiceRow[]
  isLoading?: boolean
  onRowClick: (invoice: InvoiceRow) => void
}

export function InvoicesTable({ data, isLoading, onRowClick }: InvoicesTableProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      onRowClick={onRowClick}
      emptyText="Chưa có hóa đơn nào. Hãy tải lên tệp XML để bắt đầu."
    />
  )
}
