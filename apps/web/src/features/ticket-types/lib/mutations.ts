import type { RouterInput } from '@/utils/trpc';
import { queryClient, trpc } from '@/utils/trpc';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { handleError } from '@/lib/errors';

export type CreateTicketTypeRequestType =
  RouterInput['ticketTypes']['createTicketType'];

export const useCreateTicketTypeMutation = () =>
  useMutation(
    trpc.ticketTypes.createTicketType.mutationOptions({
      onSuccess: (res) => {
        if (res?.message) {
          toast.success(res.message);
        }
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
      onError: (error) => {
        handleError(error);
      },
    }),
  );

export type EditTicketTypeRequestType =
  RouterInput['ticketTypes']['editTicketType'];

export const useEditTicketTypeMutation = () =>
  useMutation(
    trpc.ticketTypes.editTicketType.mutationOptions({
      onSuccess: (res) => {
        if (res?.message) {
          toast.success(res.message);
        }
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
      onError: (error) => {
        handleError(error);
      },
    }),
  );

export type DeleteTicketTypeRequestType =
  RouterInput['ticketTypes']['deleteTicketType'];

export const useDeleteTicketTypeMutation = () =>
  useMutation(
    trpc.ticketTypes.deleteTicketType.mutationOptions({
      onSuccess: (res) => {
        if (res?.message) {
          toast.success(res.message);
        }
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
      onError: (error) => {
        handleError(error);
      },
    }),
  );

export const useSaveIssueTypeFieldsMutation = () =>
  useMutation(
    trpc.fields.saveIssueTypeFields.mutationOptions({
      onSuccess: (res) => {
        if (res?.message) {
          toast.success(res.message);
        }
        queryClient.invalidateQueries({
          queryKey: trpc.ticketTypes.getTicketTypes.queryKey(),
        });
        // Invalidate all issue type detail queries
        queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey[0]) &&
            query.queryKey[0][0] === 'ticketTypes' &&
            query.queryKey[0][1] === 'getIssueTypeWithDetailsByIssueTypeId',
        });
      },
      onError: (error) => {
        handleError(error);
      },
    }),
  );
