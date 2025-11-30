import { db } from '@/db';
import { ticketTypeRepository } from '@/repositories/ticket-type-repository';
import { fieldRepository } from '@/repositories/field-repository';
import { IssueRepository } from '@/repositories/issue-repository';
import type {
  CreateTicketTypeSchema,
  EditTicketTypeSchema,
  GetTicketTypeByIdRequestSchema,
  DeleteTicketTypeRequestSchema,
  GetFieldsForTicketTypeRequestSchema,
  GetIssueTypeWithDetailsByIssueTypeIdRequestSchema,
} from '@taskmaster/validation';
import { throwNotFoundError, throwConflictError } from '@/lib/errors';
import type { DrizzleClient } from '@/lib/types/db';
import { resolveFieldsForIssueType, type ResolvedField } from './field-config-resolver';

export const ticketTypeService = (drizzle: DrizzleClient = db) => {
  const repository = ticketTypeRepository(drizzle);
  const fieldRepo = fieldRepository(drizzle);
  const issueRepository = new IssueRepository();

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

      return await repository.update(data);
    },

    deleteTicketType: async (input: DeleteTicketTypeRequestSchema) => {
      const existingTicketType = await repository.findById(input.ticketTypeId);
      if (!existingTicketType) {
        throwNotFoundError('TICKET_TYPE_NOT_FOUND', {
          ticketTypeId: input.ticketTypeId,
        });
      }

      // Check if issue type is in use by any issue
      const issueCount = await issueRepository.countByIssueTypeId(input.ticketTypeId);
      if (issueCount > 0) {
        throwConflictError('ISSUE_TYPE_IN_USE', {
          ticketTypeId: input.ticketTypeId,
          issueCount,
          message: `Issue type is used by ${issueCount} issue(s)`,
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
