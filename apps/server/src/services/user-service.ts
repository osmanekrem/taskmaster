import { db } from '@/db';
import { userRepository } from '@/repositories/user-repository';
import type {
  GetUsersRequestSchema,
  GetUserByIdRequestSchema,
  CreateUserSchema,
  EditUserSchema,
} from '@taskmaster/validation';
import { throwNotFoundError, throwConflictError } from '@/lib/errors';
import type { DrizzleClient } from '@/lib/types/db';

export const userService = (drizzle: DrizzleClient = db) => {
  const repository = userRepository(drizzle);

  return {
    getAllUsers: () => repository.findMany(),

    getUsersPaginated: async (data: GetUsersRequestSchema) => {
      return await repository.findManyPaginated(data);
    },

    getUserById: async (input: GetUserByIdRequestSchema) => {
      const user = await repository.findById(input.userId);
      if (!user) {
        throwNotFoundError('USER_NOT_FOUND', { userId: input.userId });
      }
      return user;
    },

    getUserByEmail: async (email: string) => {
      const user = await repository.findByEmail(email);
      if (!user) {
        throwNotFoundError('USER_NOT_FOUND', { email });
      }
      return user;
    },

    createUser: async (data: CreateUserSchema) => {
      const existingUser = await repository.findByEmail(data.email);
      if (existingUser) {
        throwConflictError('USER_EMAIL_ALREADY_EXISTS', {
          email: data.email,
        });
      }

      const { randomBytes } = await import('node:crypto');
      const id = randomBytes(16).toString('hex');

      const userData = {
        id,
        name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        password: data.password,
      } as typeof import('@/db/schema/auth').user.$inferInsert;

      return await repository.create(userData);
    },

    updateUser: async (userId: string, data: EditUserSchema) => {
      const existingUser = await repository.findById(userId);
      if (!existingUser) {
        throwNotFoundError('USER_NOT_FOUND', { userId });
      }

      // E-posta güncellenmek isteniyorsa, başka bir kullanıcı tarafından kullanılmadığından emin ol
      if (data.email && data.email !== existingUser.email) {
        const emailInUse = await repository.findByEmail(data.email);
        if (emailInUse) {
          throwConflictError('USER_EMAIL_ALREADY_EXISTS', {
            email: data.email,
          });
        }
      }

      return await repository.update(userId, data);
    },

    deleteUser: async (userId: string) => {
      const existingUser = await repository.findById(userId);
      if (!existingUser) {
        throwNotFoundError('USER_NOT_FOUND', { userId });
      }

      return await repository.delete(userId);
    },
  };
};
