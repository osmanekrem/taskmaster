import { issueTypes } from '@/db/schema/issue-types';
import { issueTypeFields } from '@/db/schema/issue-type-fields';
import { db } from '@/db';
import { asc, eq } from 'drizzle-orm';
import type {
  CreateTicketTypeSchema,
  EditTicketTypeSchema,
} from '@taskmaster/validation';
import type { DrizzleClientOrTransaction } from '@/lib/types/db';

// =============================================================================
// CLASS-BASED REPOSITORY (for DI)
// =============================================================================

export class TicketTypeRepository {
  constructor(private drizzle: DrizzleClientOrTransaction = db) {}

  findMany() {
    return this.drizzle.select().from(issueTypes);
  }

  findById(id: string) {
    return this.drizzle.query.issueTypes.findFirst({
      where: eq(issueTypes.id, id),
    });
  }

  async findFieldsForTicketType(ticketTypeId: string) {
    return this.drizzle.query.issueTypeFields.findMany({
      where: eq(issueTypeFields.issueTypeId, ticketTypeId),
      orderBy: [asc(issueTypeFields.order)],
      with: {
        field: true,
        issueType: true,
      },
    });
  }

  async create(values: CreateTicketTypeSchema) {
    const [result] = await this.drizzle
      .insert(issueTypes)
      .values(values)
      .returning();
    return result;
  }

  async update(input: EditTicketTypeSchema) {
    const { ticketTypeId: id, ...data } = input;
    const [result] = await this.drizzle
      .update(issueTypes)
      .set(data)
      .where(eq(issueTypes.id, id))
      .returning();
    return result;
  }

  async delete(id: string) {
    const [result] = await this.drizzle
      .delete(issueTypes)
      .where(eq(issueTypes.id, id))
      .returning();
    return result;
  }

  findIssueTypeWithDetailsByIssueTypeId(issueTypeId: string) {
    return this.drizzle.query.issueTypes.findFirst({
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
  }
}

// =============================================================================
// FUNCTION-BASED REPOSITORY (backward compatibility)
// =============================================================================

export const ticketTypeRepository = (
  drizzle: DrizzleClientOrTransaction = db,
) => {
  const repo = new TicketTypeRepository(drizzle);
  return {
    findMany: () => repo.findMany(),
    findById: (id: string) => repo.findById(id),
    findFieldsForTicketType: (ticketTypeId: string) =>
      repo.findFieldsForTicketType(ticketTypeId),
    create: (values: CreateTicketTypeSchema) => repo.create(values),
    update: (input: EditTicketTypeSchema) => repo.update(input),
    delete: (id: string) => repo.delete(id),
    findIssueTypeWithDetailsByIssueTypeId: (issueTypeId: string) =>
      repo.findIssueTypeWithDetailsByIssueTypeId(issueTypeId),
  };
};
