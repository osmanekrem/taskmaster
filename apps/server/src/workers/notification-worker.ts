// =============================================================================
// NOTIFICATION WORKER
// Processes notification jobs and creates in-app notifications
// =============================================================================

import { Job } from 'bullmq';
import { 
  registerWorker, 
  QUEUE_NAMES, 
  type NotificationJobData,
  addEmailJob 
} from '@/lib/queue';
import { db } from '@/db';
import { notifications } from '@/db/schema/notifications';
import { user } from '@/db/schema/auth';
import { eq, inArray } from 'drizzle-orm';

/**
 * Notification templates for different event types
 */
const NOTIFICATION_TEMPLATES: Record<NotificationJobData['type'], {
  title: (data: Record<string, unknown>) => string;
  message: (data: Record<string, unknown>) => string;
  shouldEmail: boolean;
}> = {
  issue_created: {
    title: (d) => `Yeni issue oluşturuldu: ${d.issueKey}`,
    message: (d) => `${d.userName} "${d.issueSummary}" issue'sunu oluşturdu`,
    shouldEmail: true,
  },
  issue_updated: {
    title: (d) => `Issue güncellendi: ${d.issueKey}`,
    message: (d) => `${d.userName} "${d.issueSummary}" issue'sunu güncelledi`,
    shouldEmail: false,
  },
  issue_status_changed: {
    title: (d) => `Status değişti: ${d.issueKey}`,
    message: (d) => `${d.userName} "${d.issueKey}" issue'sunu ${d.fromStatus} → ${d.toStatus} olarak değiştirdi`,
    shouldEmail: true,
  },
  issue_assigned: {
    title: (d) => `Size issue atandı: ${d.issueKey}`,
    message: (d) => `${d.userName} "${d.issueSummary}" issue'sunu size atadı`,
    shouldEmail: true,
  },
  issue_unassigned: {
    title: (d) => `Issue ataması kaldırıldı: ${d.issueKey}`,
    message: (d) => `"${d.issueKey}" issue'sundan atamanız kaldırıldı`,
    shouldEmail: false,
  },
  issue_commented: {
    title: (d) => `Yeni yorum: ${d.issueKey}`,
    message: (d) => `${d.userName} "${d.issueKey}" issue'suna yorum ekledi`,
    shouldEmail: true,
  },
  issue_mentioned: {
    title: (d) => `Bahsedildiniz: ${d.issueKey}`,
    message: (d) => `${d.userName} sizi "${d.issueKey}" issue'sunda bahsetti`,
    shouldEmail: true,
  },
  issue_deleted: {
    title: (d) => `Issue silindi: ${d.issueKey}`,
    message: (d) => `${d.userName} "${d.issueKey}" issue'sunu sildi`,
    shouldEmail: false,
  },
  comment_replied: {
    title: (d) => `Yorumunuza yanıt: ${d.issueKey}`,
    message: (d) => `${d.userName} yorumunuza yanıt verdi`,
    shouldEmail: true,
  },
  comment_mentioned: {
    title: (d) => `Yorumda bahsedildiniz: ${d.issueKey}`,
    message: (d) => `${d.userName} bir yorumda sizden bahsetti`,
    shouldEmail: true,
  },
  watching_issue_updated: {
    title: (d) => `İzlenen issue güncellendi: ${d.issueKey}`,
    message: (d) => `"${d.issueKey}" issue'sunda değişiklik yapıldı`,
    shouldEmail: false,
  },
  watching_issue_commented: {
    title: (d) => `İzlenen issue'ya yorum: ${d.issueKey}`,
    message: (d) => `"${d.issueKey}" issue'suna yorum eklendi`,
    shouldEmail: false,
  },
  watching_issue_status_changed: {
    title: (d) => `İzlenen issue status değişti: ${d.issueKey}`,
    message: (d) => `"${d.issueKey}" issue'sunun statusu değişti`,
    shouldEmail: false,
  },
  added_as_watcher: {
    title: (d) => `İzleyici olarak eklendiniz: ${d.issueKey}`,
    message: (d) => `${d.userName} sizi "${d.issueKey}" issue'sunun izleyicisi olarak ekledi`,
    shouldEmail: false,
  },
  removed_as_watcher: {
    title: (d) => `İzleyicilikten çıkarıldınız: ${d.issueKey}`,
    message: (d) => `"${d.issueKey}" issue'sunun izleyiciliğinden çıkarıldınız`,
    shouldEmail: false,
  },
  sprint_started: {
    title: (d) => `Sprint başladı: ${d.sprintName}`,
    message: (d) => `"${d.sprintName}" sprint'i başladı`,
    shouldEmail: true,
  },
  sprint_completed: {
    title: (d) => `Sprint tamamlandı: ${d.sprintName}`,
    message: (d) => `"${d.sprintName}" sprint'i tamamlandı`,
    shouldEmail: true,
  },
  workflow_transition: {
    title: (d) => `Workflow geçişi: ${d.issueKey}`,
    message: (d) => `"${d.issueKey}" issue'sunda workflow geçişi yapıldı`,
    shouldEmail: false,
  },
};

/**
 * Process a notification job
 */
async function processNotification(job: Job<NotificationJobData>): Promise<void> {
  const { type, projectId, userId, recipients, data, issueId } = job.data;
  
  console.log(`[NotificationWorker] Processing ${type} for ${recipients.length} recipients`);
  
  // Get template
  const template = NOTIFICATION_TEMPLATES[type];
  if (!template) {
    console.warn(`[NotificationWorker] Unknown notification type: ${type}`);
    return;
  }
  
  // Generate title and message
  const title = template.title(data);
  const message = template.message(data);
  
  // Filter out the user who triggered the action (don't notify yourself)
  const filteredRecipients = recipients.filter(r => r !== userId);
  
  if (filteredRecipients.length === 0) {
    console.log(`[NotificationWorker] No recipients after filtering`);
    return;
  }
  
  // Create in-app notifications
  const notificationData = filteredRecipients.map(recipientId => ({
    userId: recipientId,
    type,
    title,
    content: message,
    issueId: issueId || null,
    actorId: userId || null,
    groupKey: issueId ? `${type}:${issueId}` : `${type}:${projectId}`,
    data: data as Record<string, unknown>,
  }));
  
  // Batch insert notifications
  await db.insert(notifications).values(notificationData);
  
  console.log(`[NotificationWorker] Created ${notificationData.length} in-app notifications`);
  
  // Queue email notifications if needed
  if (template.shouldEmail) {
    // Get user emails
    const userList = await db
      .select({ id: user.id, email: user.email, name: user.name })
      .from(user)
      .where(inArray(user.id, filteredRecipients));
    
    // TODO: Check user email preferences before sending
    for (const user of userList) {
      if (user.email) {
        await addEmailJob({
          to: user.email,
          subject: title,
          template: `notification_${type}`,
          context: {
            userName: user.name,
            ...data,
          },
        });
      }
    }
    
    console.log(`[NotificationWorker] Queued ${userList.length} email notifications`);
  }
}

/**
 * Start the notification worker
 */
export function startNotificationWorker(): void {
  registerWorker<NotificationJobData>(
    QUEUE_NAMES.NOTIFICATION,
    processNotification,
    {
      concurrency: 10, // Process 10 jobs concurrently
      limiter: {
        max: 100, // Max 100 jobs
        duration: 1000, // Per second
      },
    }
  );
  
  console.log('[NotificationWorker] Started');
}
