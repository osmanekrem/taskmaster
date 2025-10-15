import z from "zod";
import {emailValidator, passwordValidator} from "@/lib/validators";

export const createUserSchema = z.object({
    firstName: z.string().min(1, "Ad zorunludur"),
    lastName: z.string().min(1, "Soyad zorunludur"),
    email: emailValidator,
    password: passwordValidator
})

export type CreateUserSchema = z.infer<typeof createUserSchema>;

export const editUserSchema = z.object({
    firstName: z.string().min(1, "Ad zorunludur"),
    lastName: z.string().min(1, "Soyad zorunludur"),
    email: emailValidator,
})

export type EditUserSchema = z.infer<typeof editUserSchema>;

export const setPasswordSchema = z.object({
    password: passwordValidator
});

export type SetPasswordSchema = z.infer<typeof setPasswordSchema>;