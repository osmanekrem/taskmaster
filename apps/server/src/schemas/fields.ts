import {z} from "zod";

export const createFieldSchema = z.object({
    name: z.string().min(1, "Alan adı zorunludur"),
    description: z.string().optional(),
    icon: z.string().optional(),
    fieldTypeId: z.string().min(1, "Alan türü ID'si zorunludur"),
})

export type CreateFieldSchema = z.infer<typeof createFieldSchema>;

export const editFieldSchema = z.object({
    fieldId: z.string().min(1, "Alan ID'si zorunludur"),
    name: z.string().min(1, "Alan adı zorunludur"),
    description: z.string().optional(),
    icon: z.string().optional(),
    fieldTypeId: z.string().min(1, "Alan türü ID'si zorunludur"),
})

export type EditFieldSchema = z.infer<typeof editFieldSchema>;

export const selectOptionSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Seçenek adı zorunludur"),
    icon: z.string().optional(),
    fieldOptionId: z.string().min(1, "Alan seçeneği ID'si zorunludur"),
    order: z.number().min(0, "Sıra numarası 0 veya daha büyük olmalıdır"),
});

export type SelectOptionSchema = z.infer<typeof selectOptionSchema>;