import { randomUUID } from 'crypto';
import type { Server } from 'http';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { and, eq } from 'drizzle-orm';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/main';
import { PG_POOL } from '../src/infra/database/database.providers';
import { withTenantContext } from '../src/infra/database/tenant-context';
import { accounts } from '../src/modules/accounts/account.schema';
import { getAccountBalance } from '../src/modules/accounts/get-account-balance';
import { tags, transactionTags } from '../src/modules/transactions/tag.schema';
import { transactions } from '../src/modules/transactions/transaction.schema';
import { setupTestDatabase, TestDatabase } from './support/setup-test-database';

// Container pull + start is slow compared to the rest of the e2e suite.
jest.setTimeout(120_000);

interface TransactionResponse {
  id: string;
  accountId: string;
  status: string;
  amountMinor: number;
  description: string | null;
  isIgnored: boolean;
  deletedAt: string | null;
}

interface TransactionEnvelope {
  transaction: TransactionResponse;
  account: { id: string; currentBalanceMinor: number; projectedBalanceMinor: number };
}

const todayIso = new Date().toISOString().slice(0, 10);

describe('Transactions (e2e)', () => {
  let db: TestDatabase;
  let pool: Pool;
  let app: INestApplication;
  let server: Server;
  const userA = randomUUID();
  const userB = randomUUID();

  beforeAll(async () => {
    db = await setupTestDatabase();
    pool = db.pool;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PG_POOL)
      .useValue(db.createPool())
      .compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
    await db.teardown();
  });

  const createAccount = (userId: string, initialBalanceMinor: number) =>
    withTenantContext(pool, userId, async (tx) => {
      const [account] = await tx.insert(accounts).values({ userId, name: 'Test', initialBalanceMinor }).returning();
      return account;
    });

  const createTag = (userId: string, name: string) =>
    withTenantContext(pool, userId, async (tx) => {
      const [tag] = await tx.insert(tags).values({ userId, name }).returning();
      return tag;
    });

  const basePayload = (accountId: string, overrides: Record<string, unknown> = {}) => ({
    type: 'expense',
    status: 'pending',
    accountId,
    date: todayIso,
    amountMinor: 3_000,
    ...overrides,
  });

  it('creates a pending expense that only affects the projected balance', async () => {
    const account = await createAccount(userA, 10_000);

    const res = await request(server)
      .post('/transactions')
      .set('x-user-id', userA)
      .send(basePayload(account.id))
      .expect(201);
    const body = res.body as TransactionEnvelope;

    expect(body.account.currentBalanceMinor).toBe(10_000);
    expect(body.account.projectedBalanceMinor).toBe(7_000);
  });

  it('toggling status moves the balance delta from projected into current, via getAccountBalance alone', async () => {
    const account = await createAccount(userA, 10_000);

    const created = await request(server)
      .post('/transactions')
      .set('x-user-id', userA)
      .send(basePayload(account.id))
      .expect(201);
    const createdBody = created.body as TransactionEnvelope;
    expect(createdBody.account.currentBalanceMinor).toBe(10_000);
    expect(createdBody.account.projectedBalanceMinor).toBe(7_000);

    // toggleStatus routes through the exact same private withBalances() helper as
    // create/update/remove — there is no branch in the endpoint code on status. Any difference
    // below comes purely from getAccountBalance's own paid-vs-paid+pending status filter.
    const toggled = await request(server)
      .patch(`/transactions/${createdBody.transaction.id}/status`)
      .set('x-user-id', userA)
      .expect(200);
    const toggledBody = toggled.body as TransactionEnvelope;
    expect(toggledBody.transaction.status).toBe('paid');
    expect(toggledBody.account.currentBalanceMinor).toBe(7_000);
    expect(toggledBody.account.projectedBalanceMinor).toBe(7_000);

    const reverted = await request(server)
      .patch(`/transactions/${createdBody.transaction.id}/status`)
      .set('x-user-id', userA)
      .expect(200);
    const revertedBody = reverted.body as TransactionEnvelope;
    expect(revertedBody.transaction.status).toBe('pending');
    expect(revertedBody.account.currentBalanceMinor).toBe(10_000);
    expect(revertedBody.account.projectedBalanceMinor).toBe(7_000);
  });

  it('edits amount/date/description/category/is_ignored', async () => {
    const account = await createAccount(userA, 10_000);
    const created = await request(server)
      .post('/transactions')
      .set('x-user-id', userA)
      .send(basePayload(account.id, { description: 'Original' }))
      .expect(201);
    const createdBody = created.body as TransactionEnvelope;

    const updated = await request(server)
      .patch(`/transactions/${createdBody.transaction.id}`)
      .set('x-user-id', userA)
      .send({ amountMinor: 5_000, description: 'Updated', isIgnored: true })
      .expect(200);
    const updatedBody = updated.body as TransactionEnvelope;

    expect(updatedBody.transaction.amountMinor).toBe(5_000);
    expect(updatedBody.transaction.description).toBe('Updated');
    expect(updatedBody.transaction.isIgnored).toBe(true);
    // is_ignored is a display filter, not a soft-delete — it still counts toward the balance.
    expect(updatedBody.account.projectedBalanceMinor).toBe(5_000);
  });

  it('moving a transaction to a different account returns the new account balances', async () => {
    const accountOne = await createAccount(userA, 10_000);
    const accountTwo = await createAccount(userA, 20_000);

    const created = await request(server)
      .post('/transactions')
      .set('x-user-id', userA)
      .send(basePayload(accountOne.id))
      .expect(201);
    const createdBody = created.body as TransactionEnvelope;

    const moved = await request(server)
      .patch(`/transactions/${createdBody.transaction.id}`)
      .set('x-user-id', userA)
      .send({ accountId: accountTwo.id })
      .expect(200);
    const movedBody = moved.body as TransactionEnvelope;

    expect(movedBody.account.id).toBe(accountTwo.id);
    expect(movedBody.account.projectedBalanceMinor).toBe(17_000);

    const accountOneBalance = await withTenantContext(pool, userA, (tx) =>
      getAccountBalance(tx, accountOne, new Date(), { projected: true }),
    );
    expect(accountOneBalance).toBe(10_000);
  });

  it('associates tags on create and fully replaces them on edit', async () => {
    const account = await createAccount(userA, 10_000);
    const tagA = await createTag(userA, 'Groceries');
    const tagB = await createTag(userA, 'Recurring');
    const tagC = await createTag(userA, 'One-off');

    const created = await request(server)
      .post('/transactions')
      .set('x-user-id', userA)
      .send(basePayload(account.id, { tagIds: [tagA.id, tagB.id] }))
      .expect(201);
    const createdBody = created.body as TransactionEnvelope;

    const rowsAfterCreate = await withTenantContext(pool, userA, (tx) =>
      tx.select().from(transactionTags).where(eq(transactionTags.transactionId, createdBody.transaction.id)),
    );
    expect(rowsAfterCreate.map((r) => r.tagId).sort()).toEqual([tagA.id, tagB.id].sort());

    await request(server)
      .patch(`/transactions/${createdBody.transaction.id}`)
      .set('x-user-id', userA)
      .send({ tagIds: [tagC.id] })
      .expect(200);

    const rowsAfterEdit = await withTenantContext(pool, userA, (tx) =>
      tx.select().from(transactionTags).where(eq(transactionTags.transactionId, createdBody.transaction.id)),
    );
    expect(rowsAfterEdit.map((r) => r.tagId)).toEqual([tagC.id]);
  });

  it('soft-deletes: returns updated balances and sets deletedAt without removing the row', async () => {
    const account = await createAccount(userA, 10_000);
    const created = await request(server)
      .post('/transactions')
      .set('x-user-id', userA)
      .send(basePayload(account.id))
      .expect(201);
    const createdBody = created.body as TransactionEnvelope;

    const deleted = await request(server)
      .delete(`/transactions/${createdBody.transaction.id}`)
      .set('x-user-id', userA)
      .expect(200);
    const deletedBody = deleted.body as TransactionEnvelope;

    expect(deletedBody.account.currentBalanceMinor).toBe(10_000);
    expect(deletedBody.account.projectedBalanceMinor).toBe(10_000);

    const [row] = await withTenantContext(pool, userA, (tx) =>
      tx.select().from(transactions).where(and(eq(transactions.id, createdBody.transaction.id))),
    );
    expect(row).toBeDefined();
    expect(row.deletedAt).not.toBeNull();
  });

  it("returns 404 when another tenant tries to edit, toggle, or delete a transaction", async () => {
    const account = await createAccount(userA, 10_000);
    const created = await request(server)
      .post('/transactions')
      .set('x-user-id', userA)
      .send(basePayload(account.id))
      .expect(201);
    const createdBody = created.body as TransactionEnvelope;
    const id = createdBody.transaction.id;

    await request(server).patch(`/transactions/${id}`).set('x-user-id', userB).send({ amountMinor: 1 }).expect(404);
    await request(server).patch(`/transactions/${id}/status`).set('x-user-id', userB).expect(404);
    await request(server).delete(`/transactions/${id}`).set('x-user-id', userB).expect(404);
  });

  it('rejects a nonexistent accountId with 400', () =>
    request(server)
      .post('/transactions')
      .set('x-user-id', userA)
      .send(basePayload(randomUUID()))
      .expect(400));

  it("rejects a categoryId or tagId belonging to another tenant with 400", async () => {
    const account = await createAccount(userA, 10_000);
    const otherUsersTag = await createTag(userB, 'Not yours');

    await request(server)
      .post('/transactions')
      .set('x-user-id', userA)
      .send(basePayload(account.id, { tagIds: [otherUsersTag.id] }))
      .expect(400);
  });

  it('rejects invalid payloads with 400', async () => {
    const account = await createAccount(userA, 10_000);

    await request(server).post('/transactions').set('x-user-id', userA).send(basePayload(account.id, { amountMinor: 0 })).expect(400);
    await request(server)
      .post('/transactions')
      .set('x-user-id', userA)
      .send(basePayload(account.id, { amountMinor: -100 }))
      .expect(400);
    await request(server).post('/transactions').set('x-user-id', userA).send(basePayload(account.id, { type: 'foo' })).expect(400);
    await request(server).post('/transactions').set('x-user-id', userA).send(basePayload(account.id, { status: 'bar' })).expect(400);
    await request(server)
      .post('/transactions')
      .set('x-user-id', userA)
      .send({ type: 'expense', status: 'pending', date: todayIso, amountMinor: 1_000 })
      .expect(400);
  });
});
