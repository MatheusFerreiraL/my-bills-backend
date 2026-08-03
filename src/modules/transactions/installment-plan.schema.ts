import { index, integer, pgTable, varchar } from 'drizzle-orm/pg-core';
import { auditColumns, id, userId } from '../../infra/database/schema-helpers';
import { tenantIsolationPolicy } from '../../infra/database/tenant-policy';

// AD-5: installments are materialized upfront — this row is just the grouping/label parent for
// the N already-created TRANSACTION rows linked by installment_plan_id + sequence.
export const installmentPlans = pgTable(
  'installment_plans',
  {
    id: id(),
    userId: userId(),
    description: varchar('description', { length: 255 }).notNull(),
    totalInstallments: integer('total_installments').notNull(),
    ...auditColumns,
  },
  (table) => [index('installment_plans_user_id_idx').on(table.userId), tenantIsolationPolicy(table.userId)],
).enableRLS();
