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

/**
 * Ticket/Issue Type management service
 * Handles CRUD operations for issue types (tickets)
 */
export class TicketTypeService {
  private repository: ReturnType<typeof ticketTypeRepository>;
  private fieldRepo: ReturnType<typeof fieldRepository>;
  private issueRepository: IssueRepository;

  constructor(private drizzle: DrizzleClient = db) {
    this.repository = ticketTypeRepository(drizzle);
    this.fieldRepo = fieldRepository(drizzle);
    this.issueRepository = new IssueRepository();
  }

  getAllTicketTypes() {
    return this.repository.findMany();
  }

  getTicketTypeById(input: GetTicketTypeByIdRequestSchema) {
    return this.repository.findById(input.ticketTypeId);
  }

  /**
   * Get resolved fields for a ticket type
   * Returns fields with merged config (base + override)
   */
  async getFieldsForTicketType(
    input: GetFieldsForTicketTypeRequestSchema,
  ): Promise<ResolvedField[]> {
    const issueTypeFields = await this.fieldRepo.findIssueTypeFieldsWithFieldByIssueTypeId(
      input.ticketTypeId,
    );
    return resolveFieldsForIssueType(issueTypeFields);
  }

  async createTicketType(data: CreateTicketTypeSchema) {
    return await this.repository.create(data);
  }

  async updateTicketType(data: EditTicketTypeSchema) {
    const existingTicketType = await this.repository.findById(data.ticketTypeId);
    if (!existingTicketType) {
      throwNotFoundError('TICKET_TYPE_NOT_FOUND', {
        ticketTypeId: data.ticketTypeId,
      });
    }

    return await this.repository.update(data);
  }

  async deleteTicketType(input: DeleteTicketTypeRequestSchema) {
    const existingTicketType = await this.repository.findById(input.ticketTypeId);
    if (!existingTicketType) {
      throwNotFoundError('TICKET_TYPE_NOT_FOUND', {
        ticketTypeId: input.ticketTypeId,
      });
    }

    // Check if issue type is in use by any issue
    const issueCount = await this.issueRepository.countByIssueTypeId(input.ticketTypeId);
    if (issueCount > 0) {
      throwConflictError('ISSUE_TYPE_IN_USE', {
        ticketTypeId: input.ticketTypeId,
        issueCount,
        message: `Issue type is used by ${issueCount} issue(s)`,
      });
    }

    return await this.repository.delete(input.ticketTypeId);
  }

  /**
   * Get issue type with resolved field details
   */
  async getIssueTypeWithDetailsByIssueTypeId(
    input: GetIssueTypeWithDetailsByIssueTypeIdRequestSchema,
  ) {
    const issueType = await this.repository.findById(input.issueTypeId);

    if (!issueType) {
      return null;
    }

    // Get resolved fields for this issue type
    const issueTypeFields = await this.fieldRepo.findIssueTypeFieldsWithFieldByIssueTypeId(
      input.issueTypeId,
    );
    const resolvedFields = resolveFieldsForIssueType(issueTypeFields);

    return {
      ...issueType,
      fields: resolvedFields,
    };
  }
}

// Factory function for backward compatibility during migration
export const ticketTypeService = (drizzle: DrizzleClient = db) => {
  const service = new TicketTypeService(drizzle);
  return {
    getAllTicketTypes: () => service.getAllTicketTypes(),
    getTicketTypeById: (input: GetTicketTypeByIdRequestSchema) => service.getTicketTypeById(input),
    getFieldsForTicketType: (input: GetFieldsForTicketTypeRequestSchema) => service.getFieldsForTicketType(input),
    createTicketType: (data: CreateTicketTypeSchema) => service.createTicketType(data),
    updateTicketType: (data: EditTicketTypeSchema) => service.updateTicketType(data),
    deleteTicketType: (input: DeleteTicketTypeRequestSchema) => service.deleteTicketType(input),
    getIssueTypeWithDetailsByIssueTypeId: (input: GetIssueTypeWithDetailsByIssueTypeIdRequestSchema) => service.getIssueTypeWithDetailsByIssueTypeId(input),
  };
};