import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool, PoolClient } from 'pg';

/**
 * AD-3 seam: every tenant-scoped read/write must run through this wrapper, not against the pool
 * directly. It sets the RLS-checked session variable inside the same transaction as the caller's
 * queries, so Postgres row-level security policies can key off `current_setting('app.current_user_id')`.
 */
export async function withTenantContext<T>(
  pool: Pool,
  userId: string,
  fn: (db: NodePgDatabase) => Promise<T>,
): Promise<T> {
  const client: PoolClient = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true)', ['app.current_user_id', userId]);
    const result = await fn(drizzle(client));
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
