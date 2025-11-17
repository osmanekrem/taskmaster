import type { RouterInput } from '@/utils/trpc';
import { queryClient, trpc } from '@/utils/trpc';
import { useMutation } from '@tanstack/react-query';

export type CreateTicketTypeRequestType =
  RouterInput['ticketTypes']['createTicketType'];

export const useCreateTicketTypeMutation = () =>
  useMutation(
    trpc.ticketTypes.createTicketType.mutationOptions({
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: ['ticket-types'] });
        queryClient.invalidateQueries({
          queryKey: ['ticket-type', res?.data?.id],
        });
      },
    }),
  );

export type EditTicketTypeRequestType =
  RouterInput['ticketTypes']['editTicketType'];

export const useEditTicketTypeMutation = () =>
  useMutation(
    trpc.ticketTypes.editTicketType.mutationOptions({
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: ['ticket-types'] });
        queryClient.invalidateQueries({
          queryKey: ['ticket-type', res?.data?.id],
        });
      },
    }),
  );

export type DeleteTicketTypeRequestType =
  RouterInput['ticketTypes']['deleteTicketType'];

export const useDeleteTicketTypeMutation = () =>
  useMutation(
    trpc.ticketTypes.deleteTicketType.mutationOptions({
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: ['ticket-types'] });
        queryClient.invalidateQueries({
          queryKey: ['ticket-type', res?.data?.id],
        });
      },
    }),
  );

export const useSaveIssueTypeFieldsMutation = () =>
  useMutation(
    trpc.fields.saveIssueTypeFields.mutationOptions({
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: ['ticket-types'] });
        queryClient.invalidateQueries({
          queryKey: ['ticket-type', res?.data?.[0]?.issueTypeId],
        });
      },
    }),
  );
