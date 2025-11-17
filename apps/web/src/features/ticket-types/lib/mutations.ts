import type { RouterInput } from '@/utils/trpc';
import { queryClient, trpc } from '@/utils/trpc';
import { useMutation } from '@tanstack/react-query';

export type CreateTicketTypeRequestType =
  RouterInput['ticketTypes']['createTicketType'];

export const useCreateTicketTypeMutation = () =>
  useMutation(
    trpc.ticketTypes.createTicketType.mutationOptions({
      onSuccess: (res) => {
        queryClient.invalidateQueries({
          queryKey: trpc.ticketTypes.getTicketTypes.queryKey(),
        });
        if (res?.data?.id) {
          queryClient.invalidateQueries({
            queryKey: trpc.ticketTypes.getTicketTypeById.queryKey({
              ticketTypeId: res.data.id,
            }),
          });
        }
      },
    }),
  );

export type EditTicketTypeRequestType =
  RouterInput['ticketTypes']['editTicketType'];

export const useEditTicketTypeMutation = () =>
  useMutation(
    trpc.ticketTypes.editTicketType.mutationOptions({
      onSuccess: (res) => {
        queryClient.invalidateQueries({
          queryKey: trpc.ticketTypes.getTicketTypes.queryKey(),
        });
        if (res?.data?.id) {
          queryClient.invalidateQueries({
            queryKey: trpc.ticketTypes.getTicketTypeById.queryKey({
              ticketTypeId: res.data.id,
            }),
          });
        }
      },
    }),
  );

export type DeleteTicketTypeRequestType =
  RouterInput['ticketTypes']['deleteTicketType'];

export const useDeleteTicketTypeMutation = () =>
  useMutation(
    trpc.ticketTypes.deleteTicketType.mutationOptions({
      onSuccess: (res) => {
        queryClient.invalidateQueries({
          queryKey: trpc.ticketTypes.getTicketTypes.queryKey(),
        });
        if (res?.data?.id) {
          queryClient.invalidateQueries({
            queryKey: trpc.ticketTypes.getTicketTypeById.queryKey({
              ticketTypeId: res.data.id,
            }),
          });
        }
      },
    }),
  );

export const useSaveIssueTypeFieldsMutation = () =>
  useMutation(
    trpc.fields.saveIssueTypeFields.mutationOptions({
      onSuccess: (res) => {
        queryClient.invalidateQueries({
          queryKey: trpc.ticketTypes.getTicketTypes.queryKey(),
        });
        if (res?.data?.[0]?.issueTypeId) {
          queryClient.invalidateQueries({
            queryKey:
              trpc.ticketTypes.getIssueTypeWithDetailsByIssueTypeId.queryKey({
                issueTypeId: res.data[0].issueTypeId,
              }),
          });
        }
      },
    }),
  );
