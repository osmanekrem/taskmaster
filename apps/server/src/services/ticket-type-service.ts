import { db } from '@/db';
import { ticketTypeRepository } from '@/repositories/ticket-type-repository';
import type {
  CreateTicketTypeSchema,
  EditTicketTypeSchema,
} from '@taskmaster/validation';

type DrizzleClient = typeof db;

// Transform issue type field to match field structure for reusable components
function transformIssueTypeFieldToFieldStructure(issueTypeField: any) {
  if (!issueTypeField?.field) {
    return null;
  }

  return {
    id: issueTypeField.field.id,
    name: issueTypeField.field.name,
    icon: issueTypeField.field.icon,
    fieldTypeId: issueTypeField.field.fieldTypeId,
    fieldType: issueTypeField.field.fieldType,
    options:
      issueTypeField.options?.map((option: any) => ({
        id: option.id,
        value: option.value,
        order: option.order,
        fieldId: issueTypeField.field.id,
        fieldTypeId: issueTypeField.field.fieldTypeId,
        fieldTypeOptionId: option.fieldOption?.fieldTypeOptionId,
        fieldTypeOption: option.fieldOption?.fieldTypeOption,
        selectOptions: option.selectOptions || [],
      })) || [],
  };
}

export const ticketTypeService = (drizzle: DrizzleClient = db) => {
  const repository = ticketTypeRepository(drizzle);

  return {
    getAllTicketTypes: () => repository.findMany(),

    getTicketTypeById: (id: string) => repository.findById(id),

    getFieldsForTicketType: (ticketTypeId: string) =>
      repository.findFieldsForTicketType(ticketTypeId),

    createTicketType: async (data: CreateTicketTypeSchema) => {
      return await repository.create(data);
    },

    updateTicketType: async (
      id: string,
      data: Omit<EditTicketTypeSchema, 'ticketTypeId'>,
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
      const result = await repository.findIssueTypeWithDetailsByIssueTypeId(
        issueTypeId,
      );

      if (!result) {
        return null;
      }

      // Transform fields to match field structure
      const transformedFields =
        result.fields
          ?.map(transformIssueTypeFieldToFieldStructure)
          .filter(
            (field): field is NonNullable<typeof field> => field !== null,
          ) || [];

      return {
        ...result,
        fields: transformedFields,
      };
    },
  };
};
