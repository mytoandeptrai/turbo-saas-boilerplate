import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { InvoicesPage } from '@/features/invoices/invoices-page'
import { setupAuthenticatedState } from '@/testing/auth-fixtures'
import { renderWithProviders } from '@/testing/render'

describe('invoicesPage', () => {
  it('lists invoices with Vietnamese money, date and status formatting', async () => {
    setupAuthenticatedState()
    renderWithProviders(<InvoicesPage />)

    const row = (await screen.findByText('00000123')).closest('tr')!
    expect(within(row).getByText('12/03/2026')).toBeInTheDocument()
    expect(within(row).getByText('5.400.000 ₫')).toBeInTheDocument()
    expect(within(row).getByText('Hợp lệ')).toBeInTheDocument()

    const mismatchRow = screen.getByText('00000456').closest('tr')!
    expect(within(mismatchRow).getByText('Lệch tiền')).toBeInTheDocument()
  })

  it('shows totals in the summary cards', async () => {
    setupAuthenticatedState()
    renderWithProviders(<InvoicesPage />)

    expect(await screen.findByText('6.100.000 ₫')).toBeInTheDocument()
    expect(screen.getByText('400.000 ₫')).toBeInTheDocument()
    expect(screen.getByText('Hóa đơn lệch tiền')).toBeInTheDocument()
  })

  it('opens the detail dialog with line items and reconciliation issues', async () => {
    setupAuthenticatedState()
    const user = userEvent.setup()
    renderWithProviders(<InvoicesPage />)

    await user.click(await screen.findByText('00000456'))

    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText('Gạo ST25 túi 5kg')).toBeInTheDocument()
    expect(
      within(dialog).getByText('Tiền hàng + thuế GTGT không khớp tổng thanh toán'),
    ).toBeInTheDocument()
    expect(within(dialog).getByText('Ngày lập 05/01/2026', { exact: false })).toBeInTheDocument()
  })

  it('reports duplicated files after an upload', async () => {
    setupAuthenticatedState()
    const user = userEvent.setup()
    renderWithProviders(<InvoicesPage />)

    const file = new File(['<HDon/>'], 'hoa-don-123.xml', { type: 'text/xml' })
    await user.upload(screen.getByTestId('invoice-file-input'), file)

    await waitFor(() => {
      expect(screen.getByText('Trùng lặp')).toBeInTheDocument()
    })
    // jsdom's FormData drops the file name on the wire, so only the outcome is asserted
    expect(screen.getByText(/0 đã lưu · 1 trùng lặp/)).toBeInTheDocument()
    expect(screen.getByText(/Hóa đơn đã tồn tại trong hệ thống/)).toBeInTheDocument()
  })
})
