import {mutationOptions} from "@tanstack/react-query";
import {queryClient, type RouterInput, type RouterOutput, trpcClient} from "@/utils/trpc";

type CreateFieldRequestType = RouterInput["fields"]["createField"];
type CreateFieldResponseType = RouterOutput["fields"]["createField"];

export const createFieldMutation = mutationOptions<CreateFieldResponseType, Error, CreateFieldRequestType>({
    mutationFn: (data) => {
        return trpcClient.fields.createField.mutate(data);
    },
    onSuccess: (res) => {
        queryClient.invalidateQueries({queryKey: ["fields"]});
        queryClient.invalidateQueries({queryKey: ["fields-with-details"]});
        queryClient.invalidateQueries({queryKey: ["fields-with-field-type"]});
    },
})

type EditFieldRequestType = RouterInput["fields"]["editField"];
type EditFieldResponseType = RouterOutput["fields"]["editField"];

export const editFieldMutation = mutationOptions<EditFieldResponseType, Error, EditFieldRequestType>({
    mutationFn: (data) => {
        return trpcClient.fields.editField.mutate(data);
    },
    onSuccess: (res) => {
        queryClient.invalidateQueries({queryKey: ["fields"]});
        queryClient.invalidateQueries({queryKey: ["fields-with-details"]});
        queryClient.invalidateQueries({queryKey: ["fields-with-field-type"]});
        queryClient.invalidateQueries({queryKey: ["field", res?.data?.id]});
        queryClient.invalidateQueries({queryKey: ["field-with-details", res?.data?.id]});
        queryClient.invalidateQueries({queryKey: ["field-with-field-type", res?.data?.id]});
    },
})

type DeleteFieldRequestType = RouterInput["fields"]["deleteField"];
type DeleteFieldResponseType = RouterOutput["fields"]["deleteField"];

export const deleteFieldMutation = mutationOptions<DeleteFieldResponseType, Error, DeleteFieldRequestType>({
    mutationFn: (data) => {
        return trpcClient.fields.deleteField.mutate(data);
    },
    onSuccess: (res) => {
        queryClient.invalidateQueries({queryKey: ["fields"]});
        queryClient.invalidateQueries({queryKey: ["fields-with-details"]});
        queryClient.invalidateQueries({queryKey: ["fields-with-field-type"]});
        queryClient.invalidateQueries({queryKey: ["field", res?.data?.id]});
        queryClient.invalidateQueries({queryKey: ["field-with-details", res?.data?.id]});
        queryClient.invalidateQueries({queryKey: ["field-with-field-type", res?.data?.id]});
    },
})

type UpdateFieldOptionValueRequest = RouterInput["fields"]["updateFieldOptionValue"];
type UpdateFieldOptionValueResponse = RouterOutput["fields"]["updateFieldOptionValue"];

export const updateFieldOptionValueMutation = mutationOptions<UpdateFieldOptionValueResponse, Error, UpdateFieldOptionValueRequest>({
    mutationFn: (data) => {
        return trpcClient.fields.updateFieldOptionValue.mutate(data);
    },
    onSuccess: (res) => {
        queryClient.invalidateQueries({queryKey: ["field-options", res?.data?.fieldId]});
        queryClient.invalidateQueries({queryKey: ["field-with-details", res?.data?.fieldId]});
        queryClient.invalidateQueries({queryKey: ["field-with-field-type", res?.data?.fieldId]});
    },
});

type SaveSelectOptionsRequest = RouterInput["fields"]["saveSelectOptions"];
type SaveSelectOptionsResponse = RouterOutput["fields"]["saveSelectOptions"];

export const saveSelectOptionsMutation = mutationOptions<SaveSelectOptionsResponse, Error, SaveSelectOptionsRequest>({
    mutationFn: (data) => {
        return trpcClient.fields.saveSelectOptions.mutate(data);
    },
    onSuccess: (res) => {
        queryClient.invalidateQueries({queryKey: ["select-options-by-field-option", res?.data?.fieldOptionId]});
        queryClient.invalidateQueries({queryKey: ["field-options", res?.data?.fieldId]});
        queryClient.invalidateQueries({queryKey: ["field-with-details", res?.data?.fieldId]});
        queryClient.invalidateQueries({queryKey: ["field-with-field-type", res?.data?.fieldId]});
    },
});