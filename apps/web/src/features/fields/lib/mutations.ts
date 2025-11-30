import { useMutation } from '@tanstack/react-query';
import { queryClient, type RouterInput, trpc } from '@/utils/trpc';
import { toast } from 'sonner';
import { handleError } from '@/lib/errors';

export type CreateFieldRequestType = RouterInput['fields']['createField'];

export const useCreateFieldMutation = () =>
  useMutation(
    trpc.fields.createField.mutationOptions({
      onSuccess: (res) => {
        if (res?.message) {
          toast.success(res.message);
        }
        queryClient.invalidateQueries({
          queryKey: trpc.fields.getFields.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.fields.getFieldsWithDefaults.queryKey(),
        });
      },
      onError: (error) => {
        handleError(error);
      },
    }),
  );

export type EditFieldRequestType = RouterInput['fields']['editField'];

export const useEditFieldMutation = () =>
  useMutation(
    trpc.fields.editField.mutationOptions({
      onSuccess: (res) => {
        if (res?.message) {
          toast.success(res.message);
        }
        queryClient.invalidateQueries({
          queryKey: trpc.fields.getFields.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.fields.getFieldsWithDefaults.queryKey(),
        });
        if (res?.data?.id) {
          queryClient.invalidateQueries({
            queryKey: trpc.fields.getFieldById.queryKey({
              fieldId: res.data.id,
            }),
          });
        }
      },
      onError: (error) => {
        handleError(error);
      },
    }),
  );

// Alias for useEditFieldMutation
export const useUpdateFieldMutation = useEditFieldMutation;

export type DeleteFieldRequestType = RouterInput['fields']['deleteField'];

export const useDeleteFieldMutation = () =>
  useMutation(
    trpc.fields.deleteField.mutationOptions({
      onSuccess: (res) => {
        if (res?.message) {
          toast.success(res.message);
        }
        queryClient.invalidateQueries({
          queryKey: trpc.fields.getFields.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.fields.getFieldsWithDefaults.queryKey(),
        });
        if (res?.data?.id) {
          queryClient.invalidateQueries({
            queryKey: trpc.fields.getFieldById.queryKey({
              fieldId: res.data.id,
            }),
          });
        }
      },
      onError: (error) => {
        handleError(error);
      },
    }),
  );

export type SaveIssueTypeFieldsRequest =
  RouterInput['fields']['saveIssueTypeFields'];

export const useSaveIssueTypeFieldsMutation = () =>
  useMutation(
    trpc.fields.saveIssueTypeFields.mutationOptions({
      onSuccess: (res) => {
        if (res?.message) {
          toast.success(res.message);
        }
        // Invalidate issue type fields queries
        queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey[0]) &&
            query.queryKey[0][0] === 'ticketTypes',
        });
      },
      onError: (error) => {
        handleError(error);
      },
    }),
  );

export type AddFieldToIssueTypeRequest =
  RouterInput['fields']['addFieldToIssueType'];

export const useAddFieldToIssueTypeMutation = () =>
  useMutation(
    trpc.fields.addFieldToIssueType.mutationOptions({
      onSuccess: (res) => {
        if (res?.message) {
          toast.success(res.message);
        }
        queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey[0]) &&
            query.queryKey[0][0] === 'ticketTypes',
        });
      },
      onError: (error) => {
        handleError(error);
      },
    }),
  );

export type RemoveFieldFromIssueTypeRequest =
  RouterInput['fields']['removeFieldFromIssueType'];

export const useRemoveFieldFromIssueTypeMutation = () =>
  useMutation(
    trpc.fields.removeFieldFromIssueType.mutationOptions({
      onSuccess: (res) => {
        if (res?.message) {
          toast.success(res.message);
        }
        queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey[0]) &&
            query.queryKey[0][0] === 'ticketTypes',
        });
      },
      onError: (error) => {
        handleError(error);
      },
    }),
  );

export type UpdateIssueTypeFieldOverrideRequest =
  RouterInput['fields']['updateIssueTypeFieldOverride'];

export const useUpdateIssueTypeFieldOverrideMutation = () =>
  useMutation(
    trpc.fields.updateIssueTypeFieldOverride.mutationOptions({
      onSuccess: (res) => {
        if (res?.message) {
          toast.success(res.message);
        }
        queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey[0]) &&
            query.queryKey[0][0] === 'ticketTypes',
        });
      },
      onError: (error) => {
        handleError(error);
      },
    }),
  );
