import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import { withTenantContext } from '../src/infra/database/tenant-context';
import { accounts } from '../src/modules/accounts/account.schema';
import { setupTestDatabase, TestDatabase } from './support/setup-test-database';

// Container pull + start is slow compared to the rest of the e2e suite.
jest.setTimeout(120_000);

describe('AD-3 row-level security (tenant isolation)', () => {
  let db: TestDatabase;
  let pool: Pool;

  const userA = randomUUID();
  const userB = randomUUID();

  beforeAll(async () => {
    db = await setupTestDatabase();
    pool = db.pool;

    await withTenantContext(pool, userA, (db) =>
      db.insert(accounts).values({ userId: userA, name: 'User A checking', initialBalanceMinor: 1000 }),
    );
    await withTenantContext(pool, userB, (db) =>
      db.insert(accounts).values({ userId: userB, name: 'User B checking', initialBalanceMinor: 2000 }),
    );
  });

  afterAll(async () => {
    await db?.teardown();
  });

  it('returns zero rows for a query with no tenant context applied, even though rows exist', async () => {
    const result = await pool.query('select * from accounts');
    expect(result.rows).toHaveLength(0);
  });

  it('scopes reads to the current tenant only, not zero and not every tenant', async () => {
    const rowsForA = await withTenantContext(pool, userA, (db) => db.select().from(accounts));
    expect(rowsForA).toHaveLength(1);
    expect(rowsForA[0].userId).toBe(userA);

    const rowsForB = await withTenantContext(pool, userB, (db) => db.select().from(accounts));
    expect(rowsForB).toHaveLength(1);
    expect(rowsForB[0].userId).toBe(userB);
  });
});
