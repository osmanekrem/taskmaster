import { z } from 'zod';

// ID Schema
export const idSchema = z.string().min(1, 'ID zorunludur');
export type IdSchema = z.infer<typeof idSchema>;

// Email Schema (merged from web emailValidator and server emailSchema)
export const emailSchema = z.string().email('Geçersiz e-posta adresi');
export type EmailSchema = z.infer<typeof emailSchema>;

// Password Validator (from web)
export const passwordValidator = z.string().min(8, 'Şifre en az 8 karakterden oluşmalıdır');
export type PasswordValidator = z.infer<typeof passwordValidator>;

// Role Schema
export const roleSchema = z.enum(['admin', 'user']);
export type RoleSchema = z.infer<typeof roleSchema>;

// Sort Order Schema
export const sortOrderSchema = z.enum(['asc', 'desc']);
export type SortOrderSchema = z.infer<typeof sortOrderSchema>;

