import {z} from "zod";

export const createFieldSchema = z.object({
    name: z.string().min(1, "Alan adı zorunludur"),
    fieldTypeId: z.string().min(1, "Alan türü ID'si zorunludur"),
})

export const editFieldSchema = z.object({
    fieldId: z.string().min(1, "Alan ID'si zorunludur"),
    name: z.string().min(1, "Alan adı zorunludur"),
    fieldTypeId: z.string().min(1, "Alan türü ID'si zorunludur"),
})