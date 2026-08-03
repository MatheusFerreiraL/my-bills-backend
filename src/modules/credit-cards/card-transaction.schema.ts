import { date, index, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { categories } from '../categories/category.schema';
import { auditColumns, currencyCode, id, moneyMinor, userId } from '../../infra/database/schema-helpers';
import { tenantIsolationPolicy } from '../../infra/database/tenant-policy';
import { invoices } from './invoice.schema';

// Deliberately a distinct table from TRANSACTION: a card purchase never moves account balance,
// it accrues to the card's open invoice. Refund/credit and partial-invoice-payment semantics are
// an open question (architecture-decisions.md Open Questions #2) — not resolved here.
export const cardTransactions = pgTable(
  'card_transactions',
  {
    id: id(),
    userId: userId(),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'restrict' }),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    date: date('date').notNull(),
    amountMinor: moneyMinor('amount_minor'),
    currencyCode: currencyCode(),
    description: text('description'),
    ...auditColumns,
  },
  (table) => [
    index('card_transactions_user_id_idx').on(table.userId),
    index('card_transactions_invoice_id_idx').on(table.invoiceId),
    tenantIsolationPolicy(table.userId),
  ],
).enableRLS();
