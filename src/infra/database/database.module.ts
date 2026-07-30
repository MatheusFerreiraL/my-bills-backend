import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { DRIZZLE_CLIENT, PG_POOL, drizzleProvider, pgPoolProvider } from './database.providers';

@Global()
@Module({
  providers: [pgPoolProvider, drizzleProvider],
  exports: [PG_POOL, DRIZZLE_CLIENT],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
