// =============================================================================
// EVENT TO QUEUE BRIDGE
// Listens to EventBus events and queues notifications
// Uses Notification Schemes to determine recipients
// =============================================================================

import { 
  eventBus, 
  type IssueEventPayload, 
  type CommentEventPayload,
  type SprintEventPayload,
} from '@/lib/events/event-bus';
import { 
  addNotificationJob, 
  addEmailJob,
} from '@/lib/queue';
import { db } from '@/db';
import { issueWatchers } from '@/db/schema/notifications';
import { issues } from '@/db/schema/issues';
import { projects } from '@/db/schema/projects';
import { sprints } from '@/db/schema/sprints';
import { user } from '@/db/schema/auth';
import { eq } from 'drizzle-orm';
import { isRedisAvailable } from '@/lib/redis';
import { notificationSchemeRepository } from '@/repositories/notification-scheme-repository';
import type { NotificationRecipientType } from '@/db/schema/notifications';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function getIssueWatchers(issueId: string): Promise<string[]> {
  const watchers = await db
    .select({ userId: issueWatchers.userId })
    .from(issueWatchers)
    .where(eq(issueWatchers.issueId, issueId));
  return watchers.map(w => w.userId);
}

async function getIssueContext(issueId: string) {
  const issue = await db.query.issues.findFirst({
    where: eq(issues.id, issueId),
    columns: {
      key: true,
      summary: true,
      projectId: true,
      assigneeId: true,
      reporterId: true,
    },
    with: {
      project: {
        columns: {
          leadId: true,
        },
      },
    },
  });
  
  if (!issue) return null;
  
  return {
    issueKey: issue.key,
    issueSummary: issue.summary ?? 'No summary',
    projectId: issue.projectId,
    projectLeadId: issue.project?.leadId ?? null,
    assigneeId: issue.assigneeId,
    reporterId: issue.reporterId,
  };
}

async function getProjectLead(projectId: string): Promise<string | null> {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    columns: { leadId: true },
  });
  return project?.leadId ?? null;
}

async function getSprintContext(sprintId: string) {
  const sprint = await db.query.sprints.findFirst({
    where: eq(sprints.id, sprintId),
    columns: { name: true, projectId: true },
  });
  
  if (!sprint) return null;
  
  return {
    sprintName: sprint.name,
    projectId: sprint.projectId,
  };
}

async function resolveRecipientType(
  recipientType: NotificationRecipientType,
  ctx: {
    issueId?: string;
    projectId: string;
    actorId?: string;
    assigneeId?: string | null;
    reporterId?: string | null;
    projectLeadId?: string | null;
    previousAssigneeId?: string | null;
  }
): Promise<string[]> {
  switch (recipientType) {
    case 'current_assignee':
      return ctx.assigneeId ? [ctx.assigneeId] : [];
    case 'reporter':
      return ctx.reporterId ? [ctx.reporterId] : [];
    case 'project_lead':
      return ctx.projectLeadId ? [ctx.projectLeadId] : [];
    case 'previous_assignee':
      return ctx.previousAssigneeId ? [ctx.previousAssigneeId] : [];
    case 'all_watchers':
      return ctx.issueId ? await getIssueWatchers(ctx.issueId) : [];
    case 'current_user':
      return ctx.actorId ? [ctx.actorId] : [];
    default:
      return [];
  }
}

async function getRecipientsFromScheme(
  projectId: string,
  eventType: string,
  ctx: {
    issueId?: string;
    actorId?: string | null;
    assigneeId?: string | null;
    reporterId?: string | null;
    projectLeadId?: string | null;
    previousAssigneeId?: string | null;
  }
) {
  const eventMappings = await notificationSchemeRepository.getRecipientsForEvent(
    projectId,
    eventType
  );
  
  const inAppRecipients = new Set<string>();
  const emailRecipients = new Set<string>();
  
  for (const mapping of eventMappings) {
    const userIds = await resolveRecipientType(mapping.recipientType, {
      ...ctx,
      actorId: ctx.actorId ?? undefined,
      projectId,
    });
    
    for (const userId of userIds) {
      if (userId === ctx.actorId) continue;
      
      if (mapping.channels.includes('in_app')) {
        inAppRecipients.add(userId);
      }
      if (mapping.channels.includes('email')) {
        emailRecipients.add(userId);
      }
    }
  }
  
  return {
    inAppRecipients: Array.from(inAppRecipients),
    emailRecipients: Array.from(emailRecipients),
  };
}

async function sendEmailToRecipients(
  recipientIds: string[],
  subject: string,
  template: string,
  contextData: Record<string, unknown>
) {
  for (const recipientId of recipientIds) {
    const recipient = await db.query.user.findFirst({
      where: eq(user.id, recipientId),
      columns: { email: true, name: true },
    });
    
    if (recipient?.email) {
      await addEmailJob({
        to: recipient.email,
        subject,
        template,
        context: {
          recipientName: recipient.name || 'User',
          ...contextData,
        },
      });
    }
  }
}

// =============================================================================
// SETUP EVENT LISTENERS
// =============================================================================

export async function setupEventToQueueBridge(): Promise<void> {
  const redisAvailable = await isRedisAvailable();
  
  if (!redisAvailable) {
    console.warn('[EventToQueue] Redis not available, notification queue disabled');
    return;
  }
  
  console.log('[EventToQueue] Setting up event listeners...');

  // Issue Created
  eventBus.on<IssueEventPayload>('issue:created', async (payload) => {
    const ctx = await getIssueContext(payload.issueId);
    if (!ctx) return;
    
    const { inAppRecipients, emailRecipients } = await getRecipientsFromScheme(
      ctx.projectId,
      'issue_created',
      {
        issueId: payload.issueId,
        actorId: payload.actorId,
        assigneeId: ctx.assigneeId,
        reporterId: ctx.reporterId,
        projectLeadId: ctx.projectLeadId,
      }
    );
    
    if (inAppRecipients.length > 0) {
      await addNotificationJob({
        type: 'issue_created',
        issueId: payload.issueId,
        projectId: ctx.projectId,
        userId: payload.actorId || '',
        recipients: inAppRecipients,
        data: { issueKey: ctx.issueKey, issueSummary: ctx.issueSummary },
      });
    }
    
    await sendEmailToRecipients(
      emailRecipients,
      `[${ctx.issueKey}] New issue: ${ctx.issueSummary}`,
      'issue_created',
      { issueKey: ctx.issueKey, issueSummary: ctx.issueSummary }
    );
  });

  // Issue Updated
  eventBus.on<IssueEventPayload>('issue:updated', async (payload) => {
    const ctx = await getIssueContext(payload.issueId);
    if (!ctx) return;
    
    const { inAppRecipients } = await getRecipientsFromScheme(
      ctx.projectId,
      'issue_updated',
      {
        issueId: payload.issueId,
        actorId: payload.actorId,
        assigneeId: ctx.assigneeId,
        reporterId: ctx.reporterId,
        projectLeadId: ctx.projectLeadId,
      }
    );
    
    if (inAppRecipients.length > 0) {
      await addNotificationJob({
        type: 'watching_issue_updated',
        issueId: payload.issueId,
        projectId: ctx.projectId,
        userId: payload.actorId || '',
        recipients: inAppRecipients,
        data: { issueKey: ctx.issueKey, changes: payload.changes },
      });
    }
  });

  // Issue Transitioned
  eventBus.on<IssueEventPayload>('issue:transitioned', async (payload) => {
    const ctx = await getIssueContext(payload.issueId);
    if (!ctx) return;
    
    const { inAppRecipients, emailRecipients } = await getRecipientsFromScheme(
      ctx.projectId,
      'issue_status_changed',
      {
        issueId: payload.issueId,
        actorId: payload.actorId,
        assigneeId: ctx.assigneeId,
        reporterId: ctx.reporterId,
        projectLeadId: ctx.projectLeadId,
      }
    );
    
    if (inAppRecipients.length > 0) {
      await addNotificationJob({
        type: 'issue_status_changed',
        issueId: payload.issueId,
        projectId: ctx.projectId,
        userId: payload.actorId || '',
        recipients: inAppRecipients,
        data: {
          issueKey: ctx.issueKey,
          fromStatus: payload.changes?.statusId?.from,
          toStatus: payload.changes?.statusId?.to,
        },
      });
    }
    
    await sendEmailToRecipients(
      emailRecipients,
      `[${ctx.issueKey}] Status changed`,
      'issue_status_changed',
      {
        issueKey: ctx.issueKey,
        fromStatus: payload.changes?.statusId?.from,
        toStatus: payload.changes?.statusId?.to,
      }
    );
  });

  // Issue Assigned
  eventBus.on<IssueEventPayload>('issue:assigned', async (payload) => {
    const ctx = await getIssueContext(payload.issueId);
    if (!ctx) return;
    
    const { inAppRecipients, emailRecipients } = await getRecipientsFromScheme(
      ctx.projectId,
      'issue_assigned',
      {
        issueId: payload.issueId,
        actorId: payload.actorId,
        assigneeId: ctx.assigneeId,
        reporterId: ctx.reporterId,
        projectLeadId: ctx.projectLeadId,
      }
    );
    
    if (inAppRecipients.length > 0) {
      await addNotificationJob({
        type: 'issue_assigned',
        issueId: payload.issueId,
        projectId: ctx.projectId,
        userId: payload.actorId || '',
        recipients: inAppRecipients,
        data: { issueKey: ctx.issueKey, issueSummary: ctx.issueSummary },
      });
    }
    
    await sendEmailToRecipients(
      emailRecipients,
      `[${ctx.issueKey}] You have been assigned: ${ctx.issueSummary}`,
      'issue_assigned',
      { issueKey: ctx.issueKey, issueSummary: ctx.issueSummary }
    );
  });

  // Issue Unassigned
  eventBus.on<IssueEventPayload>('issue:unassigned', async (payload) => {
    const previousAssignee = payload.changes?.assigneeId?.from as string | undefined;
    const ctx = await getIssueContext(payload.issueId);
    if (!ctx) return;
    
    const { inAppRecipients } = await getRecipientsFromScheme(
      ctx.projectId,
      'issue_unassigned',
      {
        issueId: payload.issueId,
        actorId: payload.actorId,
        assigneeId: ctx.assigneeId,
        reporterId: ctx.reporterId,
        projectLeadId: ctx.projectLeadId,
        previousAssigneeId: previousAssignee,
      }
    );
    
    if (inAppRecipients.length > 0) {
      await addNotificationJob({
        type: 'issue_unassigned',
        issueId: payload.issueId,
        projectId: ctx.projectId,
        userId: payload.actorId || '',
        recipients: inAppRecipients,
        data: { issueKey: ctx.issueKey },
      });
    }
  });

  // Issue Commented
  eventBus.on<IssueEventPayload>('issue:commented', async (payload) => {
    const ctx = await getIssueContext(payload.issueId);
    if (!ctx) return;
    
    const { inAppRecipients, emailRecipients } = await getRecipientsFromScheme(
      ctx.projectId,
      'issue_commented',
      {
        issueId: payload.issueId,
        actorId: payload.actorId,
        assigneeId: ctx.assigneeId,
        reporterId: ctx.reporterId,
        projectLeadId: ctx.projectLeadId,
      }
    );
    
    if (inAppRecipients.length > 0) {
      await addNotificationJob({
        type: 'issue_commented',
        issueId: payload.issueId,
        projectId: ctx.projectId,
        userId: payload.actorId || '',
        recipients: inAppRecipients,
        data: { issueKey: ctx.issueKey, commentId: payload.commentId },
      });
    }
    
    await sendEmailToRecipients(
      emailRecipients,
      `[${ctx.issueKey}] New comment added`,
      'issue_commented',
      { issueKey: ctx.issueKey, issueSummary: ctx.issueSummary }
    );
  });

  // Sprint Started
  eventBus.on<SprintEventPayload>('sprint:started', async (payload) => {
    const sprintCtx = await getSprintContext(payload.sprintId);
    if (!sprintCtx) return;
    
    const projectLeadId = await getProjectLead(payload.projectId);
    
    const { inAppRecipients, emailRecipients } = await getRecipientsFromScheme(
      payload.projectId,
      'sprint_started',
      { actorId: payload.actorId, projectLeadId }
    );
    
    if (inAppRecipients.length > 0) {
      await addNotificationJob({
        type: 'sprint_started',
        projectId: payload.projectId,
        userId: payload.actorId || '',
        recipients: inAppRecipients,
        data: { sprintName: sprintCtx.sprintName },
      });
    }
    
    await sendEmailToRecipients(
      emailRecipients,
      `Sprint Started: ${sprintCtx.sprintName}`,
      'sprint_started',
      { sprintName: sprintCtx.sprintName }
    );
  });

  // Sprint Completed
  eventBus.on<SprintEventPayload>('sprint:completed', async (payload) => {
    const sprintCtx = await getSprintContext(payload.sprintId);
    if (!sprintCtx) return;
    
    const projectLeadId = await getProjectLead(payload.projectId);
    
    const { inAppRecipients, emailRecipients } = await getRecipientsFromScheme(
      payload.projectId,
      'sprint_completed',
      { actorId: payload.actorId, projectLeadId }
    );
    
    if (inAppRecipients.length > 0) {
      await addNotificationJob({
        type: 'sprint_completed',
        projectId: payload.projectId,
        userId: payload.actorId || '',
        recipients: inAppRecipients,
        data: { sprintName: sprintCtx.sprintName },
      });
    }
    
    await sendEmailToRecipients(
      emailRecipients,
      `Sprint Completed: ${sprintCtx.sprintName}`,
      'sprint_completed',
      { sprintName: sprintCtx.sprintName }
    );
  });

  // Comment Created (for replies)
  eventBus.on<CommentEventPayload>('comment:created', async (payload) => {
    if (payload.parentCommentId) {
      // TODO: Get parent comment author and send notification
    }
  });

  console.log('[EventToQueue] Event listeners setup complete');
}
