import { issueTypes } from '@/db/schema/issue-types';
import { issueTypeFields } from '@/db/schema/issue-type-fields';
import { db } from '@/db';
import { asc, eq } from 'drizzle-orm';
import type {
  CreateTicketTypeSchema,
  EditTicketTypeSchema,
} from '@taskmaster/validation';
import type { DrizzleClient } from '@/lib/types/db';

export const ticketTypeRepository = (drizzle: DrizzleClient = db) => ({
  findMany: () => drizzle.select().from(issueTypes),

  findById: (id: string) =>
    drizzle.query.issueTypes.findFirst({
      where: eq(issueTypes.id, id),
    }),

  findFieldsForTicketType: async (ticketTypeId: string) => {
    // Basitleştirilmiş query - artık CTE'ye gerek yok
    return drizzle.query.issueTypeFields.findMany({
      where: eq(issueTypeFields.issueTypeId, ticketTypeId),
      orderBy: [asc(issueTypeFields.order)],
      with: {
        field: true,
        issueType: true,
      },
    });
  },

  create: async (values: CreateTicketTypeSchema) => {
    const [result] = await drizzle
      .insert(issueTypes)
      .values(values)
      .returning();
    return result;
  },

  update: async (
    id: string,
    values: Omit<EditTicketTypeSchema, 'ticketTypeId'>,
  ) => {
    const [result] = await drizzle
      .update(issueTypes)
      .set(values)
      .where(eq(issueTypes.id, id))
      .returning();
    return result;
  },

  delete: async (id: string) => {
    const [result] = await drizzle
      .delete(issueTypes)
      .where(eq(issueTypes.id, id))
      .returning();
    return result;
  },

  findIssueTypeWithDetailsByIssueTypeId: async (issueTypeId: string) => {
    return drizzle.query.issueTypes.findFirst({
      where: eq(issueTypes.id, issueTypeId),
      with: {
        fields: {
          orderBy: [asc(issueTypeFields.order)],
          with: {
            field: true,
          },
        },
      },
    });
  },
});

