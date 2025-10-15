import {z} from "zod";

export const successResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
    z.object({
        success: z.literal(true),
        message: z.string().optional(),
        data: dataSchema,
    });

export const errorResponseSchema = z.object({
    success: z.literal(false),
    message: z.string(),
    error: z.object({
        code: z.string().optional(),
        details: z.any().optional(),
    })
});
