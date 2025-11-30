import {protectedProcedure, publicProcedure, router} from "../lib/trpc";
import {userRouter} from "@/routers/user";
import {ticketTypesRouter} from "@/routers/ticket-types";
import {fieldTypesRouter} from "@/routers/field-types";
import {fieldsRouter} from "@/routers/fields";
import {statusesRouter} from "@/routers/statuses";
import {workflowsRouter} from "@/routers/workflows";
import {projectsRouter} from "@/routers/projects";
import {issuesRouter} from "@/routers/issues";
import {commentsRouter} from "@/routers/comments";

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
    statuses: statusesRouter,
    workflows: workflowsRouter,
    projects: projectsRouter,
    issues: issuesRouter,
    comments: commentsRouter,
});
export type AppRouter = typeof appRouter;
