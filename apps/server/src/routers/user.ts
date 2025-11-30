import { protectedProcedure, router } from '@/lib/trpc';
import {
  getUserByIdRequestSchema,
  getUsersRequestSchema,
} from '@taskmaster/validation';
import { successResponse } from '@/utils/response';
import { requirePermission } from '@/lib/middleware/permission';

export const userRouter = router({
  me: protectedProcedure.query(({ ctx }) => {
    return { data: ctx.session.user };
  }),
  getUsers: protectedProcedure
    .use(requirePermission('user:view'))
    .query(async ({ ctx }) => {
      const data = await ctx.services.user.getAllUsers();
      return successResponse(data, 'Kullanıcılar başarıyla getirildi');
    }),
  getUserById: protectedProcedure
    .input(getUserByIdRequestSchema)
    .use(requirePermission('user:view'))
    .query(async ({ ctx, input }) => {
      const data = await ctx.services.user.getUserById(input);
      return successResponse(data, 'Kullanıcı başarıyla getirildi');
    }),
  getUsersPaginated: protectedProcedure
    .input(getUsersRequestSchema)
    .use(requirePermission('user:view'))
    .query(async ({ ctx, input }) => {
      const data = await ctx.services.user.getUsersPaginated(input);
      return successResponse(data, 'Kullanıcılar başarıyla getirildi');
    }),
});
