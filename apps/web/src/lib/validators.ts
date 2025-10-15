import z from "zod";

export const passwordValidator = z.string().min(8, "Şifre en az 8 karakterden oluşmalıdır")
export const emailValidator = z.string().email("Geçersiz e-posta adresi")