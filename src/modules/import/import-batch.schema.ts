import { index, integer, pgEnum, pgTable, uuid, varchar } from 'drizzle-orm/pg-core';
import { accounts } from '../accounts/account.schema';
import { creditCards } from '../credit-cards/credit-card.schema';
import { auditColumns, id, userId } from '../../infra/database/schema-helpers';
import { tenantIsolationPolicy } from '../../infra/database/tenant-policy';

export const importSourceTypeEnum = pgEnum('import_source_type', ['csv', 'pdf']);
export const importBatchStatusEnum = pgEnum('import_batch_status', [
  'parsing',
  'review',
  'committed',
  'reversed',
  'failed',
]);

export const importBatches = pgTable(
  'import_batches',
  {
    id: id(),
    userId: userId(),
    sourceType: importSourceTypeEnum('source_type').notNull(),
    originalFilename: varchar('original_filename', { length: 512 }).notNull(),
    accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'set null' }),
    creditCardId: uuid('credit_card_id').references(() => creditCards.id, { onDelete: 'set null' }),
    // No BANK_PROFILE table exists yet (not in scope for this migration) — bare column so the
    // link can be wired up with a real FK once that table is designed.
    bankProfileId: uuid('bank_profile_id'),
    rowCount: integer('row_count').notNull().default(0),
    importedCount: integer('imported_count').notNull().default(0),
    skippedCount: integer('skipped_count').notNull().default(0),
    status: importBatchStatusEnum('status').notNull().default('parsing'),
    ...auditColumns,
  },
  (table) => [index('import_batches_user_id_idx').on(table.userId), tenantIsolationPolicy(table.userId)],
).enableRLS();
