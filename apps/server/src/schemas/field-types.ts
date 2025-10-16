import {z} from "zod";

export const createFieldTypeSchema = z.object({
    name: z.string().min(1, "Alan türü adı zorunludur"),
    component: z.string().min(1, "Bileşen adı zorunludur"),
    icon: z.string().min(1, "İkon zorunludur"),
})

export const editFieldTypeSchema = z.object({
    fieldTypeId: z.string().min(1, "Alan türü ID'si zorunludur"),
    name: z.string().min(1, "Alan türü adı zorunludur"),
    component: z.string().min(1, "Bileşen adı zorunludur"),
    icon: z.string().min(1, "İkon zorunludur"),
})