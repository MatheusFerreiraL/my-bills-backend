import { date, index, pgEnum, pgTable, uuid } from 'drizzle-orm/pg-core';
import { transactions } from '../transactions/transaction.schema';
import { auditColumns, id, userId } from '../../infra/database/schema-helpers';
import { tenantIsolationPolicy } from '../../infra/database/tenant-policy';
import { creditCards } from './credit-card.schema';

export const invoiceStatusEnum = pgEnum('invoice_status', ['open', 'closed', 'paid']);

export const invoices = pgTable(
  'invoices',
  {
    id: id(),
    // Denormalized from credit_cards.user_id — required so RLS can scope this table directly,
    // per AD-3 ("every table carries an owner key"), even though the ERD only shows
    // CREDIT_CARD as invoices' direct parent.
    userId: userId(),
    creditCardId: uuid('credit_card_id')
      .notNull()
      .references(() => creditCards.id, { onDelete: 'restrict' }),
    cycleStart: date('cycle_start').notNull(),
    cycleEnd: date('cycle_end').notNull(),
    dueDate: date('due_date').notNull(),
    status: invoiceStatusEnum('status').notNull().default('open'),
    // Paying an invoice creates exactly one bridge expense TRANSACTION in the chosen account.
    settledTransactionId: uuid('settled_transaction_id').references(() => transactions.id, {
      onDelete: 'set null',
    }),
    ...auditColumns,
  },
  (table) => [
    index('invoices_user_id_idx').on(table.userId),
    index('invoices_credit_card_id_idx').on(table.creditCardId),
    tenantIsolationPolicy(table.userId),
  ],
).enableRLS();
