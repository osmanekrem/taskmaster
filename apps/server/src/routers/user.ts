import { protectedProcedure, router } from '@/lib/trpc';
import {
  getUserByIdRequestSchema,
  getUsersRequestSchema,
} from '@taskmaster/validation';
import { successResponse } from '@/utils/response';

export const userRouter = router({
  me: protectedProcedure.query(({ ctx }) => {
    return { data: ctx.session.user };
  }),
  getUsers: protectedProcedure.query(async ({ ctx }) => {
    const data = await ctx.services.user.getAllUsers();
    return successResponse(data, 'Kullanıcılar başarıyla getirildi');
  }),
  getUserById: protectedProcedure
    .input(getUserByIdRequestSchema)
    .query(async ({ ctx, input }) => {
      const data = await ctx.services.user.getUserById(input);
      return successResponse(data, 'Kullanıcı başarıyla getirildi');
    }),
  getUsersPaginated: protectedProcedure
    .input(getUsersRequestSchema)
    .query(async ({ ctx, input }) => {
      const data = await ctx.services.user.getUsersPaginated(input);
      return successResponse(data, 'Kullanıcılar başarıyla getirildi');
    }),
});
