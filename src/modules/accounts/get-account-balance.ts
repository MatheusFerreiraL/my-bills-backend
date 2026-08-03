import { and, eq, inArray, isNull, lte, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { transactions } from '../transactions/transaction.schema';

export interface BalanceAccount {
  id: string;
  initialBalanceMinor: number;
}

export interface GetAccountBalanceOptions {
  projected: boolean;
}

/**
 * AD-1: the only function in the repo permitted to sum transactions into a balance. Every
 * balance read — current, projected, or end-of-day at an arbitrary date — goes through this.
 * No other module may query `transactions` and sum amounts directly.
 *
 * `db` must already be tenant-scoped (see `withTenantContext`) — this function performs no
 * transaction management of its own, only the pure derivation.
 */
export async function getAccountBalance(
  db: NodePgDatabase,
  account: BalanceAccount,
  date: Date | string,
  { projected }: GetAccountBalanceOptions,
): Promise<number> {
  const dateOnly = toDateOnly(date);
  const statuses = projected ? (['paid', 'pending'] as const) : (['paid'] as const);

  const [row] = await db
    .select({
      total: sql<string>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amountMinor} else -${transactions.amountMinor} end), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.accountId, account.id),
        inArray(transactions.status, statuses),
        lte(transactions.date, dateOnly),
        isNull(transactions.deletedAt),
      ),
    );

  return account.initialBalanceMinor + Number(row.total);
}

function toDateOnly(date: Date | string): string {
  if (typeof date === 'string') return date;
  return date.toISOString().slice(0, 10);
}
