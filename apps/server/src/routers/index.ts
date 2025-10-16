import {protectedProcedure, publicProcedure, router} from "../lib/trpc";
import {userRouter} from "@/routers/user";
import {ticketTypesRouter} from "@/routers/ticket-types";
import {fieldTypesRouter} from "@/routers/field-types";
import {fieldsRouter} from "@/routers/fields";

export const appRouter = router({
    healthCheck: publicProcedure.query(() => {
        return "OK";
    }),
    privateData: protectedProcedure.query(({ctx}) => {
        return {
            message: "This is private",
            user: ctx.session.user,
        };
    }),
    user: userRouter,
    ticketTypes: ticketTypesRouter,
    fieldTypes: fieldTypesRouter,
    fields: fieldsRouter,
});
export type AppRouter = typeof appRouter;
