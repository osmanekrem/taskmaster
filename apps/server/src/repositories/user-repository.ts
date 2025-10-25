import { user } from "@/db/schema/auth";
import { db } from "@/db";
import { eq } from "drizzle-orm";

type DrizzleClient = typeof db;

export const userRepository = (drizzle: DrizzleClient = db) => ({
    findMany: () => drizzle.select().from(user),

    findById: async (id: string) => {
        const result = await drizzle
            .select()
            .from(user)
            .where(eq(user.id, id))
            .limit(1);
        
        return result[0] || null;
    },

    findByEmail: async (email: string) => {
        const result = await drizzle
            .select()
            .from(user)
            .where(eq(user.email, email))
            .limit(1);
        
        return result[0] || null;
    },

    create: async (values: typeof user.$inferInsert) => {
        const [result] = await drizzle
            .insert(user)
            .values(values)
            .returning();
        return result;
    },

    update: async (id: string, values: Partial<typeof user.$inferInsert>) => {
        const [result] = await drizzle
            .update(user)
            .set(values)
            .where(eq(user.id, id))
            .returning();
        return result;
    },

    delete: async (id: string) => {
        const [result] = await drizzle
            .delete(user)
            .where(eq(user.id, id))
            .returning();
        return result;
    },
});

