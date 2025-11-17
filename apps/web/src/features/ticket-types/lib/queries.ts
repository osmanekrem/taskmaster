import { trpc } from '@/utils/trpc';

export const getTicketTypesQuery =
  trpc.ticketTypes.getTicketTypes.queryOptions();

export const getTicketTypeQuery = (ticketTypeId: string) =>
  trpc.ticketTypes.getTicketTypeById.queryOptions({ ticketTypeId });

export const getFieldsForTicketTypeQuery = (ticketTypeId: string) =>
  trpc.ticketTypes.getFieldsForTicketType.queryOptions({ ticketTypeId });

export const getIssueTypeWithDetailsByIssueTypeIdQuery = (
  issueTypeId: string,
) =>
  trpc.ticketTypes.getIssueTypeWithDetailsByIssueTypeId.queryOptions({
    issueTypeId,
  });
