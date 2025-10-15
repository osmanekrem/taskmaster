import z from "zod";
import {emailValidator, passwordValidator} from "@/lib/validators";

export const signInSchema = z.object({
    email: emailValidator,
    password: passwordValidator,
})

export type SignInSchema = z.infer<typeof signInSchema>;

export const forgotPasswordSchema = z.object({
    email: emailValidator,
})

export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;


export const resetPasswordSchema = z.object({
    password: passwordValidator,
    passwordConfirm: passwordValidator,
    token: z.string().min(1, "Geçersiz token"),
}).refine(
    (data) => data.password === data.passwordConfirm,
    {
        message: "Şifreler eşleşmiyor",
        path: ["passwordConfirm"]

    })

export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>;

export const resetPasswordSearchSchema = z.object({
    token: z.string().min(1, "Geçersiz token"),
})

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(8, "Mevcut şifre en az 8 karakterden oluşmalıdır"),
    newPassword: z.string().min(8, "Yeni şifre en az 8 karakterden oluşmalıdır")
})

export type ChangePasswordSchema = z.infer<typeof changePasswordSchema>;