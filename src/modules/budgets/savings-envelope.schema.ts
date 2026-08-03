import { index, pgTable, uuid, varchar } from 'drizzle-orm/pg-core';
import { auditColumns, currencyCode, id, moneyMinor, userId } from '../../infra/database/schema-helpers';
import { tenantIsolationPolicy } from '../../infra/database/tenant-policy';
import { budgets } from './budget.schema';

// Allocation only — a savings envelope never moves money and never hits the ledger.
export const savingsEnvelopes = pgTable(
  'savings_envelopes',
  {
    id: id(),
    userId: userId(),
    budgetId: uuid('budget_id')
      .notNull()
      .references(() => budgets.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 255 }).notNull(),
    allocationMinor: moneyMinor('allocation_minor'),
    currencyCode: currencyCode(),
    ...auditColumns,
  },
  (table) => [
    index('savings_envelopes_user_id_idx').on(table.userId),
    index('savings_envelopes_budget_id_idx').on(table.budgetId),
    tenantIsolationPolicy(table.userId),
  ],
).enableRLS();
