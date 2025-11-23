import { protectedProcedure, router } from '@/lib/trpc';
import {
  getUserByIdRequestSchema,
  getUsersRequestSchema,
} from '@taskmaster/validation';
import { successResponse } from '@/utils/response';
import { userService } from '@/services/user-service';
import { db } from '@/db';

export const userRouter = router({
  me: protectedProcedure.query(({ ctx }) => {
    return { data: ctx.session.user };
  }),
  getUsers: protectedProcedure.query(async () => {
    const service = userService(db);
    const data = await service.getAllUsers();
    return successResponse(data, 'Kullanıcılar başarıyla getirildi');
  }),
  getUserById: protectedProcedure
    .input(getUserByIdRequestSchema)
    .query(async ({ input }) => {
      const service = userService(db);
      const data = await service.getUserById(input.userId);
      return successResponse(data, 'Kullanıcı başarıyla getirildi');
    }),
  getUsersPaginated: protectedProcedure
    .input(getUsersRequestSchema)
    .query(async ({ input }) => {
      const service = userService(db);
      const data = await service.getUsersPaginated(input);
      return successResponse(data, 'Kullanıcılar başarıyla getirildi');
    }),
});
