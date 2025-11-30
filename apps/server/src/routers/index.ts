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
import {notificationsRouter} from "@/routers/notifications";
import {notificationSchemesRouter} from "@/routers/notification-schemes";
import {permissionsRouter} from "@/routers/permissions";
import {sprintsRouter} from "@/routers/sprints";
import {issueLinksRouter} from "@/routers/issue-links";
import {componentsRouter} from "@/routers/components";
import {versionsRouter} from "@/routers/versions";
import {labelsRouter} from "@/routers/labels";
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';

// Router definition - explicit any to avoid TypeScript serialization limits
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const appRouterDef: any = router({
    healthCheck: publicProcedure.query(() => {
        return "OK";
    }),
    privateData: protectedProcedure.query(({ctx}) => {
        return {
            message: "This is private",
            user: ctx.session?.user,
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
    notifications: notificationsRouter,
    notificationSchemes: notificationSchemesRouter,
    permissions: permissionsRouter,
    sprints: sprintsRouter,
    issueLinks: issueLinksRouter,
    components: componentsRouter,
    versions: versionsRouter,
    labels: labelsRouter,
});

export const appRouter = appRouterDef;
export type AppRouter = typeof appRouterDef;
export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
