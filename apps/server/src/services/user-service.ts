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

/**
 * User management service
 * Handles user CRUD operations
 */
export class UserService {
  private repository: ReturnType<typeof userRepository>;

  constructor(private drizzle: DrizzleClient = db) {
    this.repository = userRepository(drizzle);
  }

  getAllUsers() {
    return this.repository.findMany();
  }

  async getUsersPaginated(data: GetUsersRequestSchema) {
    return await this.repository.findManyPaginated(data);
  }

  async getUserById(input: GetUserByIdRequestSchema) {
    const user = await this.repository.findById(input.userId);
    if (!user) {
      throwNotFoundError('USER_NOT_FOUND', { userId: input.userId });
    }
    return user;
  }

  async getUserByEmail(email: string) {
    const user = await this.repository.findByEmail(email);
    if (!user) {
      throwNotFoundError('USER_NOT_FOUND', { email });
    }
    return user;
  }

  async createUser(data: CreateUserSchema) {
    const existingUser = await this.repository.findByEmail(data.email);
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

    return await this.repository.create(userData);
  }

  async updateUser(userId: string, data: EditUserSchema) {
    const existingUser = await this.repository.findById(userId);
    if (!existingUser) {
      throwNotFoundError('USER_NOT_FOUND', { userId });
    }

    // Check if email is being updated and not already in use
    if (data.email && data.email !== existingUser.email) {
      const emailInUse = await this.repository.findByEmail(data.email);
      if (emailInUse) {
        throwConflictError('USER_EMAIL_ALREADY_EXISTS', {
          email: data.email,
        });
      }
    }

    return await this.repository.update(userId, data);
  }

  async deleteUser(userId: string) {
    const existingUser = await this.repository.findById(userId);
    if (!existingUser) {
      throwNotFoundError('USER_NOT_FOUND', { userId });
    }

    return await this.repository.delete(userId);
  }
}

// Factory function for backward compatibility during migration
export const userService = (drizzle: DrizzleClient = db) => {
  const service = new UserService(drizzle);
  return {
    getAllUsers: () => service.getAllUsers(),
    getUsersPaginated: (data: GetUsersRequestSchema) => service.getUsersPaginated(data),
    getUserById: (input: GetUserByIdRequestSchema) => service.getUserById(input),
    getUserByEmail: (email: string) => service.getUserByEmail(email),
    createUser: (data: CreateUserSchema) => service.createUser(data),
    updateUser: (userId: string, data: EditUserSchema) => service.updateUser(userId, data),
    deleteUser: (userId: string) => service.deleteUser(userId),
  };
};