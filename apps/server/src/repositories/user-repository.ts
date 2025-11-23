import { user } from '@/db/schema/auth';
import { db } from '@/db';
import { and, asc, count, desc, eq, ilike, or } from 'drizzle-orm';
import type { GetUsersRequestSchema } from '@taskmaster/validation';
import type { DrizzleClient } from '@/lib/types/db';
import { PAGINATION } from '@/lib/constants';

export const userRepository = (drizzle: DrizzleClient = db) => ({
  findMany: () => drizzle.select().from(user),

  findById: async (id: string) => {
    const result = await drizzle
      .select()
      .from(user)
      .where(eq(user.id, id))
      .limit(1);

    return result[0] || null;
  },

  findByEmail: async (email: string) => {
    const result = await drizzle
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    return result[0] || null;
  },

  findManyPaginated: async (data: GetUsersRequestSchema) => {
    const {
      limit,
      offset,
      globalSearch,
      name,
      email,
      role,
      sortBy,
      sortOrder,
    } = data;

    const sortField = sortBy as 'name' | 'email' | 'role' | 'createdAt';
    const sort = sortField
      ? sortOrder === 'asc'
        ? asc(user[sortField])
        : desc(user[sortField])
      : undefined;

    const globalSearchQuery = globalSearch
      ? or(
          ilike(user.name, `%${globalSearch}%`),
          ilike(user.email, `%${globalSearch}%`),
        )
      : undefined;

    const resultQuery = drizzle
      .select()
      .from(user)
      .where(
        and(
          globalSearchQuery,
          name ? eq(user.name, name) : undefined,
          email ? eq(user.email, email) : undefined,
          role ? eq(user.role, role) : undefined,
        ),
      )
      .orderBy(sort ?? asc(user.createdAt))
      .limit(limit ?? PAGINATION.DEFAULT_LIMIT)
      .offset(offset ?? PAGINATION.DEFAULT_OFFSET);

    const countQuery = drizzle
      .select({ count: count() })
      .from(user)
      .where(
        and(
          globalSearchQuery,
          name ? eq(user.name, name) : undefined,
          email ? eq(user.email, email) : undefined,
          role ? eq(user.role, role) : undefined,
        ),
      );
    const [users, totalCount] = await Promise.all([resultQuery, countQuery]);

    return {
      users,
      total: totalCount[0].count ?? 0,
    };
  },

  create: async (values: typeof user.$inferInsert) => {
    const [result] = await drizzle.insert(user).values(values).returning();
    return result;
  },

  update: async (id: string, values: Partial<typeof user.$inferInsert>) => {
    const [result] = await drizzle
      .update(user)
      .set(values)
      .where(eq(user.id, id))
      .returning();
    return result;
  },

  delete: async (id: string) => {
    const [result] = await drizzle
      .delete(user)
      .where(eq(user.id, id))
      .returning();
    return result;
  },
});
