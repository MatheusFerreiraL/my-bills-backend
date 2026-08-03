import { boolean, date, index, pgEnum, pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core';
import { accounts } from '../accounts/account.schema';
import { categories } from '../categories/category.schema';
import { auditColumns, currencyCode, id, moneyMinor, userId } from '../../infra/database/schema-helpers';
import { tenantIsolationPolicy } from '../../infra/database/tenant-policy';
import { importBatches } from '../import/import-batch.schema';
import { installmentPlans } from './installment-plan.schema';
import { recurrenceRules } from './recurrence-rule.schema';

export const transactionTypeEnum = pgEnum('transaction_type', ['income', 'expense']);
export const transactionStatusEnum = pgEnum('transaction_status', ['paid', 'pending']);

export const transactions = pgTable(
  'transactions',
  {
    id: id(),
    userId: userId(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'restrict' }),
    // Nullable: an uncategorized transaction is a valid, if temporary, state.
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'restrict' }),
    type: transactionTypeEnum('type').notNull(),
    status: transactionStatusEnum('status').notNull(),
    date: date('date').notNull(),
    amountMinor: moneyMinor('amount_minor'),
    currencyCode: currencyCode(),
    description: varchar('description', { length: 255 }),
    // AD-5: marks a transaction as originating from the recurring mechanism (UI/reporting),
    // distinct from recurrenceRuleId which links back to the generating rule.
    isFixed: boolean('is_fixed').notNull().default(false),
    // Display filter, not a soft-delete — stays in the ledger so balances reconcile.
    isIgnored: boolean('is_ignored').notNull().default(false),
    installmentPlanId: uuid('installment_plan_id').references(() => installmentPlans.id, {
      onDelete: 'set null',
    }),
    recurrenceRuleId: uuid('recurrence_rule_id').references(() => recurrenceRules.id, {
      onDelete: 'set null',
    }),
    importBatchId: uuid('import_batch_id').references(() => importBatches.id, { onDelete: 'set null' }),
    // Import dedup: hash(account_id, date, amount_minor, normalized_description). Null for
    // transactions not created via import.
    fingerprint: text('fingerprint'),
    ...auditColumns,
  },
  (table) => [
    index('transactions_user_id_idx').on(table.userId),
    index('transactions_account_id_idx').on(table.accountId),
    index('transactions_category_id_idx').on(table.categoryId),
    tenantIsolationPolicy(table.userId),
  ],
).enableRLS();
