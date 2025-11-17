import { useMutation } from '@tanstack/react-query';
import { queryClient, type RouterInput, trpc } from '@/utils/trpc';

export type CreateFieldRequestType = RouterInput['fields']['createField'];

export const useCreateFieldMutation = () =>
  useMutation(
    trpc.fields.createField.mutationOptions({
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: ['fields'] });
        queryClient.invalidateQueries({ queryKey: ['fields-with-details'] });
        queryClient.invalidateQueries({ queryKey: ['fields-with-field-type'] });
      },
    }),
  );

export type EditFieldRequestType = RouterInput['fields']['editField'];

export const useEditFieldMutation = () =>
  useMutation(
    trpc.fields.editField.mutationOptions({
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: ['fields'] });
        queryClient.invalidateQueries({ queryKey: ['fields-with-details'] });
        queryClient.invalidateQueries({ queryKey: ['fields-with-field-type'] });
        queryClient.invalidateQueries({ queryKey: ['field', res?.data?.id] });
        queryClient.invalidateQueries({
          queryKey: ['field-with-details', res?.data?.id],
        });
        queryClient.invalidateQueries({
          queryKey: ['field-with-field-type', res?.data?.id],
        });
      },
    }),
  );

export type DeleteFieldRequestType = RouterInput['fields']['deleteField'];

export const useDeleteFieldMutation = () =>
  useMutation(
    trpc.fields.deleteField.mutationOptions({
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: ['fields'] });
        queryClient.invalidateQueries({ queryKey: ['fields-with-details'] });
        queryClient.invalidateQueries({ queryKey: ['fields-with-field-type'] });
        queryClient.invalidateQueries({ queryKey: ['field', res?.data?.id] });
        queryClient.invalidateQueries({
          queryKey: ['field-with-details', res?.data?.id],
        });
        queryClient.invalidateQueries({
          queryKey: ['field-with-field-type', res?.data?.id],
        });
      },
    }),
  );

export type UpdateFieldOptionValueRequest =
  RouterInput['fields']['updateFieldOptionValue'];

export const useUpdateFieldOptionValueMutation = () =>
  useMutation(
    trpc.fields.updateFieldOptionValue.mutationOptions({
      onSuccess: (res) => {
        queryClient.invalidateQueries({
          queryKey: ['field-options', res?.data?.fieldId],
        });
        queryClient.invalidateQueries({
          queryKey: ['field-with-details', res?.data?.fieldId],
        });
        queryClient.invalidateQueries({
          queryKey: ['field-with-field-type', res?.data?.fieldId],
        });
      },
    }),
  );

export type SaveSelectOptionsRequest =
  RouterInput['fields']['saveSelectOptions'];

export const useSaveSelectOptionsMutation = () =>
  useMutation(
    trpc.fields.saveSelectOptions.mutationOptions({
      onSuccess: (res) => {
        queryClient.invalidateQueries({
          queryKey: [
            'select-options-by-field-option',
            res?.data[0]?.fieldOptionId,
          ],
        });
      },
    }),
  );
