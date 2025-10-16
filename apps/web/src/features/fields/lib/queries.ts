import {queryOptions} from "@tanstack/react-query";
import {trpcClient} from "@/utils/trpc";

export const getFieldTypesQuery = queryOptions({
    queryKey: ['field-types'],
    queryFn: () => {
        return trpcClient.fieldTypes.getFieldTypes.query()
    }
})

export const getFieldTypeQuery = (fieldTypeId: string) =>
    queryOptions({
        queryKey: ['field-type', fieldTypeId],
        queryFn: () => {
            return trpcClient.fieldTypes.getFieldTypeById.query({fieldTypeId})
        }
    })

export const getFieldsQuery = queryOptions({
    queryKey: ['fields'],
    queryFn: () => {
        return trpcClient.fields.getFields.query()
    }
})

export const getFieldQuery = (fieldId: string) =>
    queryOptions({
        queryKey: ['field', fieldId],
        queryFn: () => {
            return trpcClient.fields.getFieldById.query({fieldId})
        }
    })

export const getFieldsWithDetailsQuery = queryOptions({
    queryKey: ['fields-with-details'],
    queryFn: () => {
        return trpcClient.fields.getFieldsWithDetails.query()
    }
})

export const getFieldWithDetailsQuery = (fieldId: string) =>
    queryOptions({
        queryKey: ['field-with-details', fieldId],
        queryFn: () => {
            return trpcClient.fields.getFieldWithDetailsById.query({fieldId})
        }
    })

export const getFieldsWithFieldTypeQuery = queryOptions({
    queryKey: ['fields-with-field-type'],
    queryFn: () => {
        return trpcClient.fields.getFieldsWithFieldType.query()
    }
})

export const getFieldWithFieldTypeQuery = (fieldId: string) =>
    queryOptions({
        queryKey: ['field-with-field-type', fieldId],
        queryFn: () => {
            return trpcClient.fields.getFieldWithFieldTypeById.query({fieldId})
        }
    })