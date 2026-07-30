import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

export const PG_POOL = Symbol('PG_POOL');
export const DRIZZLE_CLIENT = Symbol('DRIZZLE_CLIENT');

export const pgPoolProvider: Provider = {
  provide: PG_POOL,
  inject: [ConfigService],
  useFactory: (config: ConfigService): Pool =>
    new Pool({ connectionString: config.getOrThrow<string>('DATABASE_URL') }),
};

export const drizzleProvider: Provider = {
  provide: DRIZZLE_CLIENT,
  inject: [PG_POOL],
  useFactory: (pool: Pool): NodePgDatabase => drizzle(pool),
};
