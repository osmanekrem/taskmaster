import { protectedProcedure, router } from "@/lib/trpc";
import { getUserByIdRequestSchema } from "@/schemas/user";
import { successResponse } from "@/utils/response";
import { userService } from "@/services/user-service";
import { db } from "@/db";

export const userRouter = router({
    me: protectedProcedure.query(({ ctx }) => {
        return { data: ctx.session.user };
    }),
    
    getUserById: protectedProcedure
        .input(getUserByIdRequestSchema)
        .query(async ({ input }) => {
            const service = userService(db);
            const data = await service.getUserById(input.userId);
            return successResponse(data, "Kullanıcı başarıyla getirildi");
        }),
});