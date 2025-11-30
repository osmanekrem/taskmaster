import { db } from '@/db';
import { ticketTypeRepository } from '@/repositories/ticket-type-repository';
import { fieldRepository } from '@/repositories/field-repository';
import type {
  CreateTicketTypeSchema,
  EditTicketTypeSchema,
  GetTicketTypeByIdRequestSchema,
  DeleteTicketTypeRequestSchema,
  GetFieldsForTicketTypeRequestSchema,
  GetIssueTypeWithDetailsByIssueTypeIdRequestSchema,
} from '@taskmaster/validation';
import { throwNotFoundError } from '@/lib/errors';
import type { DrizzleClient } from '@/lib/types/db';
import { resolveFieldsForIssueType, type ResolvedField } from './field-config-resolver';

export const ticketTypeService = (drizzle: DrizzleClient = db) => {
  const repository = ticketTypeRepository(drizzle);
  const fieldRepo = fieldRepository(drizzle);

  return {
    getAllTicketTypes: () => repository.findMany(),

    getTicketTypeById: (input: GetTicketTypeByIdRequestSchema) =>
      repository.findById(input.ticketTypeId),

    /**
     * Get resolved fields for a ticket type
     * Returns fields with merged config (base + override)
     */
    getFieldsForTicketType: async (
      input: GetFieldsForTicketTypeRequestSchema,
    ): Promise<ResolvedField[]> => {
      const issueTypeFields = await fieldRepo.findIssueTypeFieldsWithFieldByIssueTypeId(
        input.ticketTypeId,
      );
      return resolveFieldsForIssueType(issueTypeFields);
    },

    createTicketType: async (data: CreateTicketTypeSchema) => {
      return await repository.create(data);
    },

    updateTicketType: async (data: EditTicketTypeSchema) => {
      const existingTicketType = await repository.findById(data.ticketTypeId);
      if (!existingTicketType) {
        throwNotFoundError('TICKET_TYPE_NOT_FOUND', {
          ticketTypeId: data.ticketTypeId,
        });
      }

      const { ticketTypeId, ...updateData } = data;
      return await repository.update(ticketTypeId, updateData);
    },

    deleteTicketType: async (input: DeleteTicketTypeRequestSchema) => {
      const existingTicketType = await repository.findById(input.ticketTypeId);
      if (!existingTicketType) {
        throwNotFoundError('TICKET_TYPE_NOT_FOUND', {
          ticketTypeId: input.ticketTypeId,
        });
      }

      return await repository.delete(input.ticketTypeId);
    },

    /**
     * Get issue type with resolved field details
     */
    getIssueTypeWithDetailsByIssueTypeId: async (
      input: GetIssueTypeWithDetailsByIssueTypeIdRequestSchema,
    ) => {
      const issueType = await repository.findById(input.issueTypeId);

      if (!issueType) {
        return null;
      }

      // Get resolved fields for this issue type
      const issueTypeFields = await fieldRepo.findIssueTypeFieldsWithFieldByIssueTypeId(
        input.issueTypeId,
      );
      const resolvedFields = resolveFieldsForIssueType(issueTypeFields);

      return {
        ...issueType,
        fields: resolvedFields,
      };
    },
  };
};
