import { db } from "@/db";
import { userRepository } from "@/repositories/user-repository";
import type { user } from "@/db/schema/auth";

type DrizzleClient = typeof db;

export const userService = (drizzle: DrizzleClient = db) => {
    const repository = userRepository(drizzle);

    return {
        getAllUsers: () => repository.findMany(),

        getUserById: async (id: string) => {
            const user = await repository.findById(id);
            if (!user) {
                throw new Error("Kullanıcı bulunamadı");
            }
            return user;
        },

        getUserByEmail: async (email: string) => {
            const user = await repository.findByEmail(email);
            if (!user) {
                throw new Error("Kullanıcı bulunamadı");
            }
            return user;
        },

        createUser: async (data: typeof user.$inferInsert) => {
            const existingUser = await repository.findByEmail(data.email);
            if (existingUser) {
                throw new Error("Bu e-posta adresi zaten kullanılıyor");
            }

            return await repository.create(data);
        },

        updateUser: async (id: string, data: Partial<typeof user.$inferInsert>) => {
            const existingUser = await repository.findById(id);
            if (!existingUser) {
                throw new Error("Kullanıcı bulunamadı");
            }

            // E-posta güncellenmek isteniyorsa, başka bir kullanıcı tarafından kullanılmadığından emin ol
            if (data.email && data.email !== existingUser.email) {
                const emailInUse = await repository.findByEmail(data.email);
                if (emailInUse) {
                    throw new Error("Bu e-posta adresi zaten kullanılıyor");
                }
            }

            return await repository.update(id, data);
        },

        deleteUser: async (id: string) => {
            const existingUser = await repository.findById(id);
            if (!existingUser) {
                throw new Error("Kullanıcı bulunamadı");
            }

            return await repository.delete(id);
        },
    };
};

