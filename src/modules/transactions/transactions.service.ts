import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DatabaseError, Pool } from 'pg';
import { accounts } from '../accounts/account.schema';
import { getAccountBalance } from '../accounts/get-account-balance';
import { categories } from '../categories/category.schema';
import { PG_POOL } from '../../infra/database/database.providers';
import { withTenantContext } from '../../infra/database/tenant-context';
import { tags, transactionTags } from './tag.schema';
import { transactions } from './transaction.schema';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

const FOREIGN_KEY_VIOLATION = '23503';

@Injectable()
export class TransactionsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  create(userId: string, dto: CreateTransactionDto) {
    return withTenantContext(this.pool, userId, async (db) => {
      const { tagIds, ...values } = dto;
      try {
        await this.ensureReferencesBelongToTenant(db, { accountId: dto.accountId, categoryId: dto.categoryId, tagIds });

        const [transaction] = await db
          .insert(transactions)
          .values({ userId, ...values })
          .returning();

        if (tagIds?.length) {
          await db.insert(transactionTags).values(tagIds.map((tagId) => ({ userId, transactionId: transaction.id, tagId })));
        }

        return this.withBalances(db, transaction);
      } catch (err) {
        this.rethrowForeignKeyViolation(err);
      }
    });
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    return withTenantContext(this.pool, userId, async (db) => {
      const { tagIds, ...values } = dto;
      try {
        await this.ensureReferencesBelongToTenant(db, { accountId: dto.accountId, categoryId: dto.categoryId, tagIds });

        // RLS scopes the row lookup to the tenant before this WHERE clause matters, so a
        // cross-tenant edit attempt naturally lands here as "not found" — same reasoning as
        // categories.service.ts's update().
        const where = and(eq(transactions.id, id), isNull(transactions.deletedAt));
        const [transaction] =
          Object.keys(values).length > 0
            ? await db.update(transactions).set(values).where(where).returning()
            : await db.select().from(transactions).where(where);

        if (!transaction) {
          throw new NotFoundException(`Transaction ${id} not found`);
        }

        if (tagIds !== undefined) {
          await db.delete(transactionTags).where(eq(transactionTags.transactionId, id));
          if (tagIds.length) {
            await db.insert(transactionTags).values(tagIds.map((tagId) => ({ userId, transactionId: id, tagId })));
          }
        }

        return this.withBalances(db, transaction);
      } catch (err) {
        this.rethrowForeignKeyViolation(err);
      }
    });
  }

  async toggleStatus(userId: string, id: string) {
    return withTenantContext(this.pool, userId, async (db) => {
      const [current] = await db
        .select({ status: transactions.status })
        .from(transactions)
        .where(and(eq(transactions.id, id), isNull(transactions.deletedAt)));
      if (!current) {
        throw new NotFoundException(`Transaction ${id} not found`);
      }

      const nextStatus = current.status === 'paid' ? 'pending' : 'paid';
      const [transaction] = await db
        .update(transactions)
        .set({ status: nextStatus })
        .where(and(eq(transactions.id, id), isNull(transactions.deletedAt)))
        .returning();

      return this.withBalances(db, transaction);
    });
  }

  async remove(userId: string, id: string) {
    return withTenantContext(this.pool, userId, async (db) => {
      const [transaction] = await db
        .update(transactions)
        .set({ deletedAt: new Date() })
        .where(and(eq(transactions.id, id), isNull(transactions.deletedAt)))
        .returning();
      if (!transaction) {
        throw new NotFoundException(`Transaction ${id} not found`);
      }

      return this.withBalances(db, transaction);
    });
  }

  /**
   * The single seam every mutating method routes its response through (AD-1/AD-2). Loads the
   * (post-mutation) account and computes both balance figures via getAccountBalance — the only
   * function in the repo permitted to sum transactions. No caller of this helper branches on
   * transaction.status or deletedAt; the current-vs-projected difference for paid/pending, and
   * the with/without-this-transaction difference for delete, come entirely from
   * getAccountBalance's own internal filtering, not from anything here.
   */
  private async withBalances(db: NodePgDatabase, transaction: typeof transactions.$inferSelect) {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, transaction.accountId));
    const today = new Date();
    const [currentBalanceMinor, projectedBalanceMinor] = await Promise.all([
      getAccountBalance(db, account, today, { projected: false }),
      getAccountBalance(db, account, today, { projected: true }),
    ]);

    return {
      transaction,
      account: { id: account.id, currentBalanceMinor, projectedBalanceMinor },
    };
  }

  /**
   * Postgres foreign key checks are exempt from row-level security (they always "see" every row
   * regardless of the querying role's RLS-visible set), so the FK on accountId/categoryId/tagId
   * alone would happily let a request attach another tenant's account, category, or tag — RLS
   * would hide it from later reads, but the reference itself would still silently succeed at
   * write time. These explicit SELECTs run through the tenant-scoped `db`, so RLS *does* apply
   * here, making this the actual enforcement point; the FK constraints remain only as a
   * defensive backstop (see rethrowForeignKeyViolation) for the same not-found case.
   */
  private async ensureReferencesBelongToTenant(
    db: NodePgDatabase,
    refs: { accountId?: string; categoryId?: string; tagIds?: string[] },
  ): Promise<void> {
    if (refs.accountId !== undefined) {
      const [account] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.id, refs.accountId));
      if (!account) throw new BadRequestException('Referenced account, category, or tag does not exist');
    }

    if (refs.categoryId !== undefined) {
      const [category] = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, refs.categoryId));
      if (!category) throw new BadRequestException('Referenced account, category, or tag does not exist');
    }

    if (refs.tagIds?.length) {
      const rows = await db.select({ id: tags.id }).from(tags).where(inArray(tags.id, refs.tagIds));
      if (rows.length !== new Set(refs.tagIds).size) {
        throw new BadRequestException('Referenced account, category, or tag does not exist');
      }
    }
  }

  private rethrowForeignKeyViolation(err: unknown): never {
    const cause = err instanceof DatabaseError ? err : err instanceof Error ? err.cause : undefined;
    if (cause instanceof DatabaseError && cause.code === FOREIGN_KEY_VIOLATION) {
      throw new BadRequestException('Referenced account, category, or tag does not exist');
    }
    throw err;
  }
}
