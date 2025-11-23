import { db } from '@/db';
import { ticketTypeRepository } from '@/repositories/ticket-type-repository';
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

type IssueTypeFieldWithDetails = NonNullable<
  Awaited<
    ReturnType<
      ReturnType<
        typeof ticketTypeRepository
      >['findIssueTypeWithDetailsByIssueTypeId']
    >
  >
>['fields'][number];

// Transform issue type field to match field structure for reusable components
function transformIssueTypeFieldToFieldStructure(
  issueTypeField: IssueTypeFieldWithDetails,
) {
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
      issueTypeField.options?.map((option) => ({
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

    getTicketTypeById: (input: GetTicketTypeByIdRequestSchema) =>
      repository.findById(input.ticketTypeId),

    getFieldsForTicketType: (input: GetFieldsForTicketTypeRequestSchema) =>
      repository.findFieldsForTicketType(input.ticketTypeId),

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

    getIssueTypeWithDetailsByIssueTypeId: async (
      input: GetIssueTypeWithDetailsByIssueTypeIdRequestSchema,
    ) => {
      const result = await repository.findIssueTypeWithDetailsByIssueTypeId(
        input.issueTypeId,
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
