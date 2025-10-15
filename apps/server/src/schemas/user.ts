import {z} from "zod";

export const getUserByIdRequestSchema = z.object({
    userId: z.string().min(1, "kullanıcı ID'si zoruludur"),
})