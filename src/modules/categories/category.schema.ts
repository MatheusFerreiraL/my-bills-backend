import { index, pgTable, varchar } from 'drizzle-orm/pg-core';
import { auditColumns, id, userId } from '../../infra/database/schema-helpers';
import { tenantIsolationPolicy } from '../../infra/database/tenant-policy';

export const categories = pgTable(
  'categories',
  {
    id: id(),
    userId: userId(),
    name: varchar('name', { length: 255 }).notNull(),
    ...auditColumns,
  },
  (table) => [index('categories_user_id_idx').on(table.userId), tenantIsolationPolicy(table.userId)],
).enableRLS();
