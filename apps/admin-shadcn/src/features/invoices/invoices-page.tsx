'use client'

import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { DownloadIcon, Loader2Icon } from 'lucide-react'
import { useEffect, useState } from 'react'

import { TablePageHeader } from '@/components/table-page-header'
import { TablePagination } from '@/components/table-pagination'
import { InvoiceDetailDialog } from '@/features/invoices/components/invoice-detail-dialog'
import { InvoiceSummaryCards } from '@/features/invoices/components/invoice-summary-cards'
import { InvoiceUploadZone } from '@/features/invoices/components/invoice-upload-zone'
import { InvoicesTable } from '@/features/invoices/components/invoices-table'
import { useInvoiceExport } from '@/features/invoices/hooks/use-invoice-export'
import { PROVIDER_LABELS, STATUS_LABELS } from '@/features/invoices/lib/labels'
import { $api } from '@/lib/api'

import type { InvoiceProvider, InvoiceStatus } from '@/features/invoices/lib/labels'

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300

type StatusFilter = 'all' | InvoiceStatus
type ProviderFilter = 'all' | InvoiceProvider

const STATUS_ITEMS: { label: string; value: StatusFilter }[] = [
  { label: 'Tất cả trạng thái', value: 'all' },
  { label: STATUS_LABELS.VALID, value: 'VALID' },
  { label: STATUS_LABELS.MISMATCH, value: 'MISMATCH' },
]

const PROVIDER_ITEMS: { label: string; value: ProviderFilter }[] = [
  { label: 'Tất cả nhà cung cấp', value: 'all' },
  ...(Object.keys(PROVIDER_LABELS) as InvoiceProvider[]).map((value) => ({
    label: PROVIDER_LABELS[value],
    value,
  })),
]

export function InvoicesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [provider, setProvider] = useState<ProviderFilter>('all')
  const [issuedFrom, setIssuedFrom] = useState('')
  const [issuedTo, setIssuedTo] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [search])

  const filter = {
    ...(debouncedSearch ? { q: debouncedSearch } : {}),
    ...(status === 'all' ? {} : { status }),
    ...(provider === 'all' ? {} : { provider }),
    ...(issuedFrom ? { issuedFrom } : {}),
    ...(issuedTo ? { issuedTo } : {}),
  }

  const { data, isLoading } = $api.useQuery('get', '/api/invoices', {
    params: { query: { page, pageSize: PAGE_SIZE, ...filter } },
  })
  const { data: stats, isLoading: isStatsLoading } = $api.useQuery('get', '/api/invoices/stats', {
    params: { query: filter },
  })
  const exportExcel = useInvoiceExport()

  const invoices = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  function resetPage<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      setPage(1)
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 pt-0">
      <TablePageHeader
        title="Hóa đơn"
        description={
          total > 0
            ? `${total.toLocaleString('vi-VN')} hóa đơn`
            : 'Quản lý hóa đơn điện tử đầu vào của hộ kinh doanh'
        }
        actions={
          <Button
            variant="outline"
            disabled={total === 0 || exportExcel.isPending}
            onClick={() => exportExcel.mutate(filter)}
          >
            {exportExcel.isPending ? <Loader2Icon className="animate-spin" /> : <DownloadIcon />}
            Xuất Excel
          </Button>
        }
      />

      <InvoiceUploadZone />

      <InvoiceSummaryCards stats={stats} isLoading={isStatsLoading} />

      <div className="flex flex-wrap items-end gap-3">
        <Input
          className="w-full sm:w-72"
          placeholder="Tìm số hóa đơn, tên hoặc MST người bán"
          aria-label="Tìm kiếm hóa đơn"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select
          items={STATUS_ITEMS}
          value={status}
          onValueChange={(value) => resetPage(setStatus)((value as StatusFilter | null) ?? 'all')}
        >
          <SelectTrigger className="w-[180px]" aria-label="Lọc theo trạng thái">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={PROVIDER_ITEMS}
          value={provider}
          onValueChange={(value) =>
            resetPage(setProvider)((value as ProviderFilter | null) ?? 'all')
          }
        >
          <SelectTrigger className="w-[200px]" aria-label="Lọc theo nhà cung cấp">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROVIDER_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Từ ngày
          <Input
            type="date"
            lang="vi"
            className="w-[160px]"
            value={issuedFrom}
            max={issuedTo || undefined}
            onChange={(event) => resetPage(setIssuedFrom)(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Đến ngày
          <Input
            type="date"
            lang="vi"
            className="w-[160px]"
            value={issuedTo}
            min={issuedFrom || undefined}
            onChange={(event) => resetPage(setIssuedTo)(event.target.value)}
          />
        </label>
      </div>

      <InvoicesTable
        data={invoices}
        isLoading={isLoading}
        onRowClick={(invoice) => setSelectedId(invoice.id)}
      />

      <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <InvoiceDetailDialog invoiceId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  )
}
