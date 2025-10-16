import { protectedProcedure, publicProcedure, router } from "../lib/trpc";
import { userRouter } from "@/routers/user";
import { ticketTypesRouter } from "@/routers/ticket-types";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: ctx.session.user,
    };
  }),
  user: userRouter,
  ticketTypes: ticketTypesRouter,
});
export type AppRouter = typeof appRouter;
