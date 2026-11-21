import { Badge } from '@workspace/ui/components/badge'

import { STATUS_LABELS } from '@/features/invoices/lib/labels'

import type { InvoiceStatus } from '@/features/invoices/lib/labels'

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return status === 'VALID' ? (
    <Badge variant="outline" className="border-green-600 text-green-600">
      {STATUS_LABELS.VALID}
    </Badge>
  ) : (
    <Badge variant="destructive">{STATUS_LABELS.MISMATCH}</Badge>
  )
}
