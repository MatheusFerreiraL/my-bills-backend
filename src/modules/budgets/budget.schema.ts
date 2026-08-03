import { date, index, numeric, pgEnum, pgTable } from 'drizzle-orm/pg-core';
import { auditColumns, currencyCode, id, moneyMinor, userId } from '../../infra/database/schema-helpers';
import { tenantIsolationPolicy } from '../../infra/database/tenant-policy';

export const budgetPeriodTypeEnum = pgEnum('budget_period_type', ['monthly', 'custom']);

// A budget is a stored SNAPSHOT: this table holds the plan as computed once at creation.
// Actuals (spent/remaining) are always computed live from transactions — never written here.
export const budgets = pgTable(
  'budgets',
  {
    id: id(),
    userId: userId(),
    periodType: budgetPeriodTypeEnum('period_type').notNull(),
    periodStart: date('period_start').notNull(),
    periodEnd: date('period_end').notNull(),
    plannedIncomeMinor: moneyMinor('planned_income_minor'),
    currencyCode: currencyCode(),
    // A rate, not a monetary amount — numeric is fine here (AD-4 bans float/numeric for money
    // specifically, not for percentages).
    savingsPercent: numeric('savings_percent', { precision: 5, scale: 2 }).notNull(),
    ...auditColumns,
  },
  (table) => [index('budgets_user_id_idx').on(table.userId), tenantIsolationPolicy(table.userId)],
).enableRLS();
