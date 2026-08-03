import { date, index, integer, pgEnum, pgTable, varchar } from 'drizzle-orm/pg-core';
import { auditColumns, id, userId } from '../../infra/database/schema-helpers';
import { tenantIsolationPolicy } from '../../infra/database/tenant-policy';

export const recurrenceFrequencyEnum = pgEnum('recurrence_frequency', ['monthly']);

// AD-5: fixed expenses are lazily generated per month from this rule — never fully materialized
// in advance. End condition is optional: occurrenceCount, endDate, or neither (indefinite).
export const recurrenceRules = pgTable(
  'recurrence_rules',
  {
    id: id(),
    userId: userId(),
    description: varchar('description', { length: 255 }).notNull(),
    frequency: recurrenceFrequencyEnum('frequency').notNull().default('monthly'),
    startDate: date('start_date').notNull(),
    endDate: date('end_date'),
    occurrenceCount: integer('occurrence_count'),
    ...auditColumns,
  },
  (table) => [index('recurrence_rules_user_id_idx').on(table.userId), tenantIsolationPolicy(table.userId)],
).enableRLS();
