import { authHandlers } from './auth'
import { invoiceHandlers } from './invoices'

export const handlers = [...authHandlers, ...invoiceHandlers]
