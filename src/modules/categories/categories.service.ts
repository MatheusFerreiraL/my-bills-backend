import { Inject, Injectable, NotFoundException, NotImplementedException } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { Pool } from 'pg';
import { PG_POOL } from '../../infra/database/database.providers';
import { withTenantContext } from '../../infra/database/tenant-context';
import { categories } from './category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  create(userId: string, dto: CreateCategoryDto) {
    return withTenantContext(this.pool, userId, async (db) => {
      const [category] = await db
        .insert(categories)
        .values({ userId, ...dto })
        .returning();
      return category;
    });
  }

  findAllForUser(userId: string) {
    return withTenantContext(this.pool, userId, (db) =>
      db.select().from(categories).where(isNull(categories.deletedAt)),
    );
  }

  async update(userId: string, id: string, dto: UpdateCategoryDto) {
    return withTenantContext(this.pool, userId, async (db) => {
      const [category] = await db
        .update(categories)
        .set(dto)
        .where(and(eq(categories.id, id), isNull(categories.deletedAt)))
        .returning();

      // RLS scopes the row lookup to the tenant before this WHERE clause matters, so a
      // cross-tenant edit attempt naturally lands here as "not found" — never leaking whether
      // another tenant's category exists.
      if (!category) {
        throw new NotFoundException(`Category ${id} not found`);
      }
      return category;
    });
  }

  /**
   * Deliberately not implemented. Category deletion semantics (block vs. reassign vs. cascade
   * soft-delete) are an unresolved open question — see architecture-decisions.md Open Question 1.
   * Do not pick a behavior here; that decision belongs in an ADR, not an implicit default.
   */
  remove(userId: string, id: string): never {
    throw new NotImplementedException(
      `Category deletion is not implemented (requested: category ${id} by user ${userId}). Deletion ` +
        'semantics (block vs. reassign vs. cascade soft-delete) are an open architecture question — see ' +
        'architecture-decisions.md Open Question 1.',
    );
  }
}
