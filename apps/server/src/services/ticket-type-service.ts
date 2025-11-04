import { db } from '@/db';
import { ticketTypeRepository } from '@/repositories/ticket-type-repository';
import type {
  CreateTicketTypeRequestSchema,
  EditTicketTypeRequestSchema,
} from '@/schemas/ticket-types';

type DrizzleClient = typeof db;

export const ticketTypeService = (drizzle: DrizzleClient = db) => {
  const repository = ticketTypeRepository(drizzle);

  return {
    getAllTicketTypes: () => repository.findMany(),

    getTicketTypeById: (id: string) => repository.findById(id),

    getFieldsForTicketType: (ticketTypeId: string) =>
      repository.findFieldsForTicketType(ticketTypeId),

    createTicketType: async (data: CreateTicketTypeRequestSchema) => {
      return await repository.create(data);
    },

    updateTicketType: async (
      id: string,
      data: Omit<EditTicketTypeRequestSchema, 'ticketTypeId'>,
    ) => {
      const existingTicketType = await repository.findById(id);
      if (!existingTicketType) {
        throw new Error('Bilet türü bulunamadı');
      }

      return await repository.update(id, data);
    },

    deleteTicketType: async (id: string) => {
      const existingTicketType = await repository.findById(id);
      if (!existingTicketType) {
        throw new Error('Bilet türü bulunamadı');
      }

      return await repository.delete(id);
    },

    getIssueTypeWithDetailsByIssueTypeId: async (issueTypeId: string) => {
      return await repository.findIssueTypeWithDetailsByIssueTypeId(
        issueTypeId,
      );
    },
  };
};
