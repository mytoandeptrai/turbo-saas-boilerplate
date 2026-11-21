import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { AlertTriangleIcon, BanknoteIcon, PercentIcon, ReceiptTextIcon } from 'lucide-react'

import { formatMoney } from '@/features/invoices/lib/format'

import type { components } from '@workspace/api-types'

type InvoiceStats = components['schemas']['InvoiceStatsResponseDto']

interface InvoiceSummaryCardsProps {
  stats?: InvoiceStats
  isLoading?: boolean
}

export function InvoiceSummaryCards({ stats, isLoading }: InvoiceSummaryCardsProps) {
  const cards = [
    {
      title: 'Tổng số hóa đơn',
      value: stats ? stats.totalInvoices.toLocaleString('vi-VN') : '—',
      hint: stats ? `${stats.validCount.toLocaleString('vi-VN')} hợp lệ` : undefined,
      icon: ReceiptTextIcon,
    },
    {
      title: 'Tổng tiền hàng',
      value: formatMoney(stats?.subtotalAmount),
      hint: 'Chưa bao gồm thuế GTGT',
      icon: BanknoteIcon,
    },
    {
      title: 'Tổng thuế GTGT',
      value: formatMoney(stats?.vatAmount),
      hint: stats ? `Tổng thanh toán ${formatMoney(stats.totalAmount)}` : undefined,
      icon: PercentIcon,
    },
    {
      title: 'Hóa đơn lệch tiền',
      value: stats ? stats.mismatchCount.toLocaleString('vi-VN') : '—',
      hint: 'Cần kiểm tra lại với người bán',
      icon: AlertTriangleIcon,
      highlight: (stats?.mismatchCount ?? 0) > 0,
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon
              className={`size-4 ${card.highlight ? 'text-destructive' : 'text-muted-foreground'}`}
            />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p
                className={`text-2xl font-semibold tabular-nums ${card.highlight ? 'text-destructive' : ''}`}
              >
                {card.value}
              </p>
            )}
            {card.hint && <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
