import { randomUUID } from 'crypto';
import type { Server } from 'http';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/main';
import { PG_POOL } from '../src/infra/database/database.providers';
import { setupTestDatabase, TestDatabase } from './support/setup-test-database';

// Container pull + start is slow compared to the rest of the e2e suite.
jest.setTimeout(120_000);

interface CategoryResponse {
  id: string;
  userId: string;
  name: string;
  icon: string;
  color: string;
  type: string;
}

describe('Categories (e2e)', () => {
  let db: TestDatabase;
  let app: INestApplication;
  let server: Server;
  const userA = randomUUID();
  const userB = randomUUID();

  beforeAll(async () => {
    db = await setupTestDatabase();
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

  const payload = { name: 'Groceries', icon: 'shopping-cart', color: '#22C55E', type: 'expense' };

  it('rejects requests with no x-user-id header', () => request(server).get('/categories').expect(400));

  it('rejects requests with a non-UUID x-user-id header', () =>
    request(server).get('/categories').set('x-user-id', 'not-a-uuid').expect(400));

  it('creates a category scoped to the requesting user', async () => {
    const res = await request(server).post('/categories').set('x-user-id', userA).send(payload).expect(201);
    expect(res.body).toMatchObject({ ...payload, userId: userA });
  });

  it('rejects an invalid create payload (bad hex color)', () =>
    request(server)
      .post('/categories')
      .set('x-user-id', userA)
      .send({ ...payload, color: 'not-a-color' })
      .expect(400));

  it("lists only the requesting user's categories (tenant isolation)", async () => {
    await request(server).post('/categories').set('x-user-id', userA).send(payload).expect(201);
    await request(server)
      .post('/categories')
      .set('x-user-id', userB)
      .send({ ...payload, name: 'Rent' })
      .expect(201);

    const resA = await request(server).get('/categories').set('x-user-id', userA).expect(200);
    const bodyA = resA.body as CategoryResponse[];
    expect(bodyA.every((c) => c.userId === userA)).toBe(true);
    expect(bodyA.some((c) => c.name === 'Rent')).toBe(false);
  });

  it('edits a category via partial update', async () => {
    const created = await request(server).post('/categories').set('x-user-id', userA).send(payload).expect(201);
    const createdBody = created.body as CategoryResponse;

    const updated = await request(server)
      .patch(`/categories/${createdBody.id}`)
      .set('x-user-id', userA)
      .send({ name: 'Supermarket' })
      .expect(200);
    expect(updated.body).toMatchObject({ name: 'Supermarket', type: 'expense' });
  });

  it("returns 404 when a user tries to edit another tenant's category", async () => {
    const created = await request(server).post('/categories').set('x-user-id', userA).send(payload).expect(201);
    const createdBody = created.body as CategoryResponse;

    await request(server)
      .patch(`/categories/${createdBody.id}`)
      .set('x-user-id', userB)
      .send({ name: 'Hijacked' })
      .expect(404);
  });

  it('returns 501 for delete, referencing the open architecture question', async () => {
    const created = await request(server).post('/categories').set('x-user-id', userA).send(payload).expect(201);
    const createdBody = created.body as CategoryResponse;

    const res = await request(server).delete(`/categories/${createdBody.id}`).set('x-user-id', userA).expect(501);
    const body = res.body as { message: string };
    expect(body.message).toMatch(/not implemented/i);
  });
});
