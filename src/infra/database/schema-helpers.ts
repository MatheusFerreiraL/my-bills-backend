import { bigint, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const id = () => uuid('id').primaryKey().defaultRandom();

export const userId = () => uuid('user_id').notNull();

export const auditColumns = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
};

/**
 * AD-4: every monetary amount is an integer minor-units column plus its own currency_code,
 * never a float/numeric. `bigint` (mode 'number') gives headroom beyond `integer`'s ~21M major
 * units without changing the "integer, no float" contract.
 */
export const moneyMinor = (dbColumnName: string) => bigint(dbColumnName, { mode: 'number' }).notNull();

export const currencyCode = () => varchar('currency_code', { length: 3 }).notNull().default('EUR');
