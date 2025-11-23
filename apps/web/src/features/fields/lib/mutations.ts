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
          queryKey: trpc.fields.getFieldsWithDetails.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.fields.getFieldsWithFieldType.queryKey(),
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
          queryKey: trpc.fields.getFieldsWithDetails.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.fields.getFieldsWithFieldType.queryKey(),
        });
        if (res?.data?.id) {
          queryClient.invalidateQueries({
            queryKey: trpc.fields.getFieldById.queryKey({
              fieldId: res.data.id,
            }),
          });
          queryClient.invalidateQueries({
            queryKey: trpc.fields.getFieldWithDetailsById.queryKey({
              fieldId: res.data.id,
            }),
          });
          queryClient.invalidateQueries({
            queryKey: trpc.fields.getFieldWithFieldTypeById.queryKey({
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
          queryKey: trpc.fields.getFieldsWithDetails.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.fields.getFieldsWithFieldType.queryKey(),
        });
        if (res?.data?.id) {
          queryClient.invalidateQueries({
            queryKey: trpc.fields.getFieldById.queryKey({
              fieldId: res.data.id,
            }),
          });
          queryClient.invalidateQueries({
            queryKey: trpc.fields.getFieldWithDetailsById.queryKey({
              fieldId: res.data.id,
            }),
          });
          queryClient.invalidateQueries({
            queryKey: trpc.fields.getFieldWithFieldTypeById.queryKey({
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

export type UpdateFieldOptionValueRequest =
  RouterInput['fields']['updateFieldOptionValue'];

export const useUpdateFieldOptionValueMutation = () =>
  useMutation(
    trpc.fields.updateFieldOptionValue.mutationOptions({
      onSuccess: (res) => {
        if (res?.message) {
          toast.success(res.message);
        }
        if (res?.data?.fieldId) {
          queryClient.invalidateQueries({
            queryKey: trpc.fields.getFieldWithDetailsById.queryKey({
              fieldId: res.data.fieldId,
            }),
          });
          queryClient.invalidateQueries({
            queryKey: trpc.fields.getFieldWithFieldTypeById.queryKey({
              fieldId: res.data.fieldId,
            }),
          });
        }
      },
      onError: (error) => {
        handleError(error);
      },
    }),
  );

export type SaveSelectOptionsRequest =
  RouterInput['fields']['saveSelectOptions'];

export const useSaveSelectOptionsMutation = () =>
  useMutation(
    trpc.fields.saveSelectOptions.mutationOptions({
      onSuccess: (res) => {
        if (res?.message) {
          toast.success(res.message);
        }
        if (res?.data?.[0]?.fieldOptionId) {
          queryClient.invalidateQueries({
            queryKey: trpc.fields.getSelectOptionsByFieldOptionId.queryKey({
              fieldOptionId: res.data[0].fieldOptionId,
            }),
          });
        }
      },
      onError: (error) => {
        handleError(error);
      },
    }),
  );
