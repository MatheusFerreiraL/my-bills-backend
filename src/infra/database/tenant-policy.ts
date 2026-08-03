import { sql } from 'drizzle-orm';
import { AnyPgColumn, pgPolicy } from 'drizzle-orm/pg-core';

/**
 * AD-3: one RLS policy shape shared by every table. `current_setting(..., true)` (missing_ok)
 * returns NULL when `app.current_user_id` has never been referenced in the session — and
 * `NULL = anything` is never true in Postgres, so an unscoped connection (or a request for the
 * wrong tenant) is denied by default rather than needing an explicit deny branch.
 *
 * `withTenantContext` sets this with `set_config(..., true)` (SET LOCAL semantics), scoped to one
 * transaction. On a *pooled* connection that has run a tenant-scoped transaction before, once that
 * transaction commits the setting doesn't go back to unset — it reverts to `''` (empty string),
 * not NULL, because the GUC now exists in the session. `''::uuid` throws instead of comparing
 * false, so a later unscoped query on that same reused connection would error instead of being
 * denied. `nullif(..., '')` normalizes both "never set" and "reset after a transaction" to NULL
 * before the cast, so both cases are denied the same way.
 *
 * Enabling this alone is not enough: the role the app connects as also owns these tables, and
 * table owners bypass RLS unless `FORCE ROW LEVEL SECURITY` is set too (added via a hand-written
 * migration, since Drizzle's `.enableRLS()` only emits `ENABLE ROW LEVEL SECURITY`). Superusers and
 * roles with `BYPASSRLS` bypass RLS unconditionally — `FORCE` has no effect on them — so the role
 * the app (and any test) connects as must be an ordinary, non-superuser role.
 */
export const tenantIsolationPolicy = (userIdColumn: AnyPgColumn) =>
  pgPolicy('tenant_isolation', {
    for: 'all',
    using: sql`${userIdColumn} = nullif(current_setting('app.current_user_id', true), '')::uuid`,
    withCheck: sql`${userIdColumn} = nullif(current_setting('app.current_user_id', true), '')::uuid`,
  });
