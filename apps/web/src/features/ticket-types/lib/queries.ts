import { queryOptions } from '@tanstack/react-query';
import { trpcClient } from '@/utils/trpc';

export const getTicketTypesQuery = queryOptions({
  queryKey: ['ticket-types'],
  queryFn: () => {
    return trpcClient.ticketTypes.getTicketTypes.query();
  },
});

export const getTicketTypeQuery = (ticketTypeId: string) =>
  queryOptions({
    queryKey: ['ticket-type', ticketTypeId],
    queryFn: () => {
      return trpcClient.ticketTypes.getTicketTypeById.query({ ticketTypeId });
    },
  });

export const getFieldsForTicketTypeQuery = (ticketTypeId: string) =>
  queryOptions({
    queryKey: ['fields-for-ticket-type', ticketTypeId],
    queryFn: () => {
      return trpcClient.ticketTypes.getFieldsForTicketType.query({
        ticketTypeId,
      });
    },
  });

export const getIssueTypeWithDetailsByIssueTypeIdQuery = (
  issueTypeId: string,
) =>
  queryOptions({
    queryKey: ['issue-type-with-details', issueTypeId],
    queryFn: () => {
      return trpcClient.ticketTypes.getIssueTypeWithDetailsByIssueTypeId.query({
        issueTypeId,
      });
    },
  });
