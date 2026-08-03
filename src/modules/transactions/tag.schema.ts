import { index, pgTable, primaryKey, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { auditColumns, id, userId } from '../../infra/database/schema-helpers';
import { tenantIsolationPolicy } from '../../infra/database/tenant-policy';
import { transactions } from './transaction.schema';

export const tags = pgTable(
  'tags',
  {
    id: id(),
    userId: userId(),
    name: varchar('name', { length: 255 }).notNull(),
    ...auditColumns,
  },
  (table) => [index('tags_user_id_idx').on(table.userId), tenantIsolationPolicy(table.userId)],
).enableRLS();

// Join table for the ERD's TRANSACTION }o--o{ TAG many-to-many relation — not a first-class
// entity of its own, but still carries user_id + RLS per AD-3 like every other table.
export const transactionTags = pgTable(
  'transaction_tags',
  {
    userId: userId(),
    transactionId: uuid('transaction_id')
      .notNull()
      .references(() => transactions.id, { onDelete: 'restrict' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.transactionId, table.tagId] }),
    index('transaction_tags_user_id_idx').on(table.userId),
    tenantIsolationPolicy(table.userId),
  ],
).enableRLS();
