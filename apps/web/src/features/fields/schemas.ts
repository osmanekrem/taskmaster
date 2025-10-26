import z from "zod";

export const addFieldSchema = z.object({
    name: z.string().min(1, "Alan adı zorunludur"),
    icon: z.string(),
    fieldTypeId: z.string().min(1, "Alan türü zorunludur"),
});

export type AddFieldSchema = z.infer<typeof addFieldSchema>;

export const editFieldSchema = z.object({
    fieldId: z.string().min(1, "Alan ID'si zorunludur"),
    name: z.string().min(1, "Alan adı zorunludur"),
    icon: z.string(),
    fieldTypeId: z.string().min(1, "Alan türü zorunludur"),
});

export type EditFieldSchema = z.infer<typeof editFieldSchema>;