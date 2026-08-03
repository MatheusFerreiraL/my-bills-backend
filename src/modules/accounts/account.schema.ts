import { index, pgTable, varchar } from 'drizzle-orm/pg-core';
import { auditColumns, currencyCode, id, moneyMinor, userId } from '../../infra/database/schema-helpers';
import { tenantIsolationPolicy } from '../../infra/database/tenant-policy';

export const accounts = pgTable(
  'accounts',
  {
    id: id(),
    userId: userId(),
    name: varchar('name', { length: 255 }).notNull(),
    bankLogo: varchar('bank_logo', { length: 512 }),
    // AD-1: this is the only stored balance figure. Everything else (current/projected balance)
    // is derived from the ledger via getAccountBalance() — never adjusted directly.
    initialBalanceMinor: moneyMinor('initial_balance_minor'),
    currencyCode: currencyCode(),
    ...auditColumns,
  },
  (table) => [index('accounts_user_id_idx').on(table.userId), tenantIsolationPolicy(table.userId)],
).enableRLS();
