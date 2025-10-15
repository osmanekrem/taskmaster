import {protectedProcedure, router} from "@/lib/trpc";
import {z} from "zod";
import {db} from "@/db";
import {user} from "@/db/schema/auth";
import {eq} from "drizzle-orm";
import {getUserByIdRequestSchema} from "@/schemas/user";
import {successResponse} from "@/utils/response";

export const userRouter = router({
    me: protectedProcedure.query(({ctx}) => {
        return {data: ctx.session.user};
    }),
    getUserById: protectedProcedure.input(getUserByIdRequestSchema).query(async ({ctx, input}) => {
        const data = await db.select().from(user).where(eq(user.id, input.userId)).limit(1);

        if (!data.length || !data[0]) {
            throw new Error("User not found");
        }

        return successResponse(data[0], "Kullanıcı başarıyla getirildi");
    })
})