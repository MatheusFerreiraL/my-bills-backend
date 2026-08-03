import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import { getAccountBalance } from '../src/modules/accounts/get-account-balance';
import { withTenantContext } from '../src/infra/database/tenant-context';
import { accounts } from '../src/modules/accounts/account.schema';
import { transactions } from '../src/modules/transactions/transaction.schema';
import { setupTestDatabase, TestDatabase } from './support/setup-test-database';

// Container pull + start is slow compared to the rest of the e2e suite.
jest.setTimeout(120_000);

describe('getAccountBalance (AD-1 pure derivation)', () => {
  let db: TestDatabase;
  let pool: Pool;

  const userId = randomUUID();

  beforeAll(async () => {
    db = await setupTestDatabase();
    pool = db.pool;
  });

  afterAll(async () => {
    await db?.teardown();
  });

  async function createAccount(initialBalanceMinor: number) {
    return withTenantContext(pool, userId, async (db) => {
      const [account] = await db.insert(accounts).values({ userId, name: 'Test account', initialBalanceMinor }).returning();
      return account;
    });
  }

  async function insertTransaction(opts: {
    accountId: string;
    type: 'income' | 'expense';
    status: 'paid' | 'pending';
    date: string;
    amountMinor: number;
  }) {
    return withTenantContext(pool, userId, (db) => db.insert(transactions).values({ userId, ...opts }));
  }

  it('paid-only balance excludes pending, projected balance includes it', async () => {
    const account = await createAccount(10_000);
    await insertTransaction({
      accountId: account.id,
      type: 'expense',
      status: 'paid',
      date: '2026-08-01',
      amountMinor: 2_000,
    });
    await insertTransaction({
      accountId: account.id,
      type: 'expense',
      status: 'pending',
      date: '2026-08-02',
      amountMinor: 3_000,
    });

    const current = await withTenantContext(pool, userId, (db) =>
      getAccountBalance(db, account, '2026-08-31', { projected: false }),
    );
    const projected = await withTenantContext(pool, userId, (db) =>
      getAccountBalance(db, account, '2026-08-31', { projected: true }),
    );

    expect(current).toBe(8_000); // 10_000 - 2_000 paid only
    expect(projected).toBe(5_000); // 10_000 - 2_000 - 3_000 paid + pending
  });

  it('computes an end-of-day balance at an arbitrary past date, excluding later transactions', async () => {
    const account = await createAccount(5_000);
    await insertTransaction({
      accountId: account.id,
      type: 'income',
      status: 'paid',
      date: '2026-01-10',
      amountMinor: 1_000,
    });
    await insertTransaction({
      accountId: account.id,
      type: 'income',
      status: 'paid',
      date: '2026-01-20',
      amountMinor: 4_000,
    });
    await insertTransaction({
      accountId: account.id,
      type: 'income',
      status: 'paid',
      date: '2026-02-01',
      amountMinor: 9_000,
    });

    const balanceAtJan15 = await withTenantContext(pool, userId, (db) =>
      getAccountBalance(db, account, '2026-01-15', { projected: false }),
    );

    expect(balanceAtJan15).toBe(6_000); // 5_000 + 1_000 (Jan 20 and Feb 1 excluded)
  });

  it('reflects a back-dated transaction inserted after other transactions already exist', async () => {
    const account = await createAccount(1_000);
    await insertTransaction({
      accountId: account.id,
      type: 'income',
      status: 'paid',
      date: '2026-03-10',
      amountMinor: 500,
    });
    await insertTransaction({
      accountId: account.id,
      type: 'income',
      status: 'paid',
      date: '2026-03-20',
      amountMinor: 700,
    });

    const beforeBackdate = await withTenantContext(pool, userId, (db) =>
      getAccountBalance(db, account, '2026-03-05', { projected: false }),
    );
    expect(beforeBackdate).toBe(1_000); // neither Mar 10 nor Mar 20 transaction counted yet

    // insert a transaction dated before both existing ones, after they already exist
    await insertTransaction({
      accountId: account.id,
      type: 'expense',
      status: 'paid',
      date: '2026-03-01',
      amountMinor: 200,
    });

    const afterBackdate = await withTenantContext(pool, userId, (db) =>
      getAccountBalance(db, account, '2026-03-05', { projected: false }),
    );
    expect(afterBackdate).toBe(800); // 1_000 - 200, now correctly included with no cache to invalidate

    const fullMonthBalance = await withTenantContext(pool, userId, (db) =>
      getAccountBalance(db, account, '2026-03-31', { projected: false }),
    );
    expect(fullMonthBalance).toBe(2_000); // 1_000 + 500 + 700 - 200, all three transactions
  });
});
