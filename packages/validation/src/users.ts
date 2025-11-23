import { z } from 'zod';
import { emailSchema, passwordValidator, idSchema, roleSchema, sortOrderSchema } from './general';

// Create User Schema (from web)
export const createUserSchema = z.object({
  firstName: z.string().min(1, 'Ad zorunludur'),
  lastName: z.string().min(1, 'Soyad zorunludur'),
  email: emailSchema,
  password: passwordValidator,
});

export type CreateUserSchema = z.infer<typeof createUserSchema>;

// Edit User Schema (from web)
export const editUserSchema = z.object({
  firstName: z.string().min(1, 'Ad zorunludur'),
  lastName: z.string().min(1, 'Soyad zorunludur'),
  email: emailSchema,
});

export type EditUserSchema = z.infer<typeof editUserSchema>;

// Set Password Schema (from web)
export const setPasswordSchema = z.object({
  password: passwordValidator,
});

export type SetPasswordSchema = z.infer<typeof setPasswordSchema>;

// Get User By ID Request Schema (from server)
export const getUserByIdRequestSchema = z.object({
  userId: idSchema,
});

export type GetUserByIdRequestSchema = z.infer<typeof getUserByIdRequestSchema>;

// Get Users Request Schema (from server)
export const getUsersRequestSchema = z.object({
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
  globalSearch: z.string().optional(),
  name: z.string().optional(),
  email: emailSchema.optional(),
  role: roleSchema.optional(),
  sortBy: z.enum(['name', 'email', 'role', 'createdAt']).optional(),
  sortOrder: sortOrderSchema.optional(),
});

export type GetUsersRequestSchema = z.infer<typeof getUsersRequestSchema>;

