import { protectedProcedure, publicProcedure, router, t } from '../lib/trpc';
import { userRouter } from '@/routers/user';
import { ticketTypesRouter } from '@/routers/ticket-types';
import { fieldTypesRouter } from '@/routers/field-types';
import { fieldsRouter } from '@/routers/fields';
import { statusesRouter } from '@/routers/statuses';
import { workflowsRouter } from '@/routers/workflows';
import { projectsRouter } from '@/routers/projects';
import { issuesRouter } from '@/routers/issues';
import { commentsRouter } from '@/routers/comments';
import { notificationsRouter } from '@/routers/notifications';
import { notificationSchemesRouter } from '@/routers/notification-schemes';
import { permissionsRouter } from '@/routers/permissions';
import { sprintsRouter } from '@/routers/sprints';
import { issueLinksRouter } from '@/routers/issue-links';
import { componentsRouter } from '@/routers/components';
import { versionsRouter } from '@/routers/versions';
import { labelsRouter } from '@/routers/labels';
import { screensRouter } from '@/routers/screens';
import { fieldConfigurationsRouter } from '@/routers/field-configurations';
import { boardsRouter } from '@/routers/boards';
import { filtersRouter } from '@/routers/filters';
import { worklogsRouter } from '@/routers/worklogs';
import { webhooksRouter } from '@/routers/webhooks';
import { auditRouter } from '@/routers/audit';
import { automationRouter } from '@/routers/automation';
import { securityRouter } from '@/routers/security';
import { groupsRouter } from '@/routers/groups';
import { adminRouter } from '@/routers/admin';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';

// =============================================================================
// Modüler Router Grupları - Her biri için explicit tip tanımı
// =============================================================================

/** Core routes - temel işlemler */
const coreRouter = router({
  healthCheck: publicProcedure.query(() => {
    return 'OK';
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: 'This is private',
      user: ctx.session?.user,
    };
  }),
  user: userRouter,
  admin: adminRouter,
  security: securityRouter,
  groups: groupsRouter,
  permissions: permissionsRouter,
});
type CoreRouter = typeof coreRouter;

/** Project & Issue Management */
const projectRouter = router({
  projects: projectsRouter,
  issues: issuesRouter,
  issueLinks: issueLinksRouter,
  comments: commentsRouter,
  worklogs: worklogsRouter,
  sprints: sprintsRouter,
  boards: boardsRouter,
  filters: filtersRouter,
});
type ProjectRouter = typeof projectRouter;

/** Configuration - alan, tip ve yapılandırma */
const configRouter = router({
  ticketTypes: ticketTypesRouter,
  fieldTypes: fieldTypesRouter,
  fields: fieldsRouter,
  fieldConfigurations: fieldConfigurationsRouter,
  screens: screensRouter,
  statuses: statusesRouter,
  workflows: workflowsRouter,
});
type ConfigRouter = typeof configRouter;

/** Components & Metadata */
const metadataRouter = router({
  components: componentsRouter,
  versions: versionsRouter,
  labels: labelsRouter,
});
type MetadataRouter = typeof metadataRouter;

/** Notifications & Integrations */
const integrationRouter = router({
  notifications: notificationsRouter,
  notificationSchemes: notificationSchemesRouter,
  webhooks: webhooksRouter,
  automation: automationRouter,
  audit: auditRouter,
});
type IntegrationRouter = typeof integrationRouter;

// =============================================================================
// Ana Router Type - intersection type ile birleştir
// =============================================================================

// Router instance'ı runtime için
const _appRouter = t.mergeRouters(
  coreRouter,
  projectRouter,
  configRouter,
  metadataRouter,
  integrationRouter,
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const appRouter: any = _appRouter;

// Tip tanımı - intersection type olarak
export type AppRouter = CoreRouter &
  ProjectRouter &
  ConfigRouter &
  MetadataRouter &
  IntegrationRouter;

export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
