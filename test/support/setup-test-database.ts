import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

const APP_ROLE = 'app_role';
const APP_ROLE_PASSWORD = 'app_role';

export interface TestDatabase {
  container: StartedPostgreSqlContainer;
  pool: Pool;
  /**
   * Creates an additional app_role-authenticated pool, independent of `pool`. Use this when
   * handing a pool to code that manages its own lifecycle (e.g. Nest's DatabaseModule, which
   * closes its injected PG_POOL in onModuleDestroy) — reusing `pool` there would double-close it
   * once both that code and `teardown()` try to end the same instance.
   */
  createPool: () => Pool;
  teardown: () => Promise<void>;
}

/**
 * Starts an ephemeral Postgres container, runs migrations, and returns a pool authenticated as
 * a restricted, non-superuser role — never the container's bootstrap superuser.
 *
 * Postgres row-level security never applies to superusers or BYPASSRLS roles, regardless of
 * FORCE ROW LEVEL SECURITY (see drizzle/0001_force-row-level-security.sql) — that only covers
 * the table-owner-bypass case. Migrations still run as the bootstrap superuser (schema DDL
 * needs elevated privileges), but every query a test makes afterwards must go through a role
 * that AD-3's tenant-isolation policies actually apply to, the same way a real deployment must
 * never point its application connection at a superuser.
 */
export async function setupTestDatabase(): Promise<TestDatabase> {
  const container = await new PostgreSqlContainer('postgres:16-alpine').start();
  const adminPool = new Pool({ connectionString: container.getConnectionUri() });

  await migrate(drizzle(adminPool), { migrationsFolder: './drizzle' });
  await adminPool.query(`CREATE ROLE ${APP_ROLE} LOGIN PASSWORD '${APP_ROLE_PASSWORD}' NOSUPERUSER NOBYPASSRLS`);
  await adminPool.query(`GRANT USAGE ON SCHEMA public TO ${APP_ROLE}`);
  await adminPool.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${APP_ROLE}`);

  const createPool = () =>
    new Pool({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: APP_ROLE,
      password: APP_ROLE_PASSWORD,
    });

  const pool = createPool();

  return {
    container,
    pool,
    createPool,
    teardown: async () => {
      await pool.end();
      await adminPool.end();
      await container.stop();
    },
  };
}
