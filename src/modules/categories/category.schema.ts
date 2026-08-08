import { index, pgEnum, pgTable, varchar } from 'drizzle-orm/pg-core';
import { auditColumns, id, userId } from '../../infra/database/schema-helpers';
import { tenantIsolationPolicy } from '../../infra/database/tenant-policy';

export const categoryTypeEnum = pgEnum('category_type', ['expense', 'income']);
export const CATEGORY_TYPES = categoryTypeEnum.enumValues;

export const categories = pgTable(
  'categories',
  {
    id: id(),
    userId: userId(),
    name: varchar('name', { length: 255 }).notNull(),
    // Frontend-interpreted icon slug (e.g. "shopping-cart"), not a URL or binary asset.
    icon: varchar('icon', { length: 255 }).notNull(),
    // Hex color, "#RGB" or "#RRGGBB".
    color: varchar('color', { length: 7 }).notNull(),
    type: categoryTypeEnum('type').notNull(),
    ...auditColumns,
  },
  (table) => [index('categories_user_id_idx').on(table.userId), tenantIsolationPolicy(table.userId)],
).enableRLS();
