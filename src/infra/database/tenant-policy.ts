import { sql } from 'drizzle-orm';
import { AnyPgColumn, pgPolicy } from 'drizzle-orm/pg-core';

/**
 * AD-3: one RLS policy shape shared by every table. `current_setting(..., true)` (missing_ok)
 * returns NULL when `app.current_user_id` hasn't been set for the session — and `NULL = anything`
 * is never true in Postgres, so an unscoped connection (or a request for the wrong tenant) is
 * denied by default rather than needing an explicit deny branch.
 *
 * Enabling this alone is not enough: the role the app connects as also owns these tables, and
 * table owners bypass RLS unless `FORCE ROW LEVEL SECURITY` is set too (added via a hand-written
 * migration, since Drizzle's `.enableRLS()` only emits `ENABLE ROW LEVEL SECURITY`).
 */
export const tenantIsolationPolicy = (userIdColumn: AnyPgColumn) =>
  pgPolicy('tenant_isolation', {
    for: 'all',
    using: sql`${userIdColumn} = current_setting('app.current_user_id', true)::uuid`,
    withCheck: sql`${userIdColumn} = current_setting('app.current_user_id', true)::uuid`,
  });
