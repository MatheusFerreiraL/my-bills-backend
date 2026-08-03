import { bigint, index, numeric, pgTable, uuid, varchar } from 'drizzle-orm/pg-core';
import { categories } from '../categories/category.schema';
import { auditColumns, id, userId } from '../../infra/database/schema-helpers';
import { tenantIsolationPolicy } from '../../infra/database/tenant-policy';
import { budgets } from './budget.schema';

// domain-model.md: "limit_minor (or percent)" — either mode may be set per category, so both
// columns are nullable rather than picking one representation upfront.
export const categoryBudgets = pgTable(
  'category_budgets',
  {
    id: id(),
    userId: userId(),
    budgetId: uuid('budget_id')
      .notNull()
      .references(() => budgets.id, { onDelete: 'restrict' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    limitMinor: bigint('limit_minor', { mode: 'number' }),
    currencyCode: varchar('currency_code', { length: 3 }),
    limitPercent: numeric('limit_percent', { precision: 5, scale: 2 }),
    ...auditColumns,
  },
  (table) => [
    index('category_budgets_user_id_idx').on(table.userId),
    index('category_budgets_budget_id_idx').on(table.budgetId),
    tenantIsolationPolicy(table.userId),
  ],
).enableRLS();
