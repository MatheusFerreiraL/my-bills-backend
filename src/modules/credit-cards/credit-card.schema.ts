import { index, integer, pgTable, varchar } from 'drizzle-orm/pg-core';
import { auditColumns, currencyCode, id, moneyMinor, userId } from '../../infra/database/schema-helpers';
import { tenantIsolationPolicy } from '../../infra/database/tenant-policy';

export const creditCards = pgTable(
  'credit_cards',
  {
    id: id(),
    userId: userId(),
    name: varchar('name', { length: 255 }).notNull(),
    creditLimitMinor: moneyMinor('credit_limit_minor'),
    currencyCode: currencyCode(),
    closingDay: integer('closing_day').notNull(),
    dueDay: integer('due_day').notNull(),
    ...auditColumns,
  },
  (table) => [index('credit_cards_user_id_idx').on(table.userId), tenantIsolationPolicy(table.userId)],
).enableRLS();
