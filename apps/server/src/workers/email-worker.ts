// =============================================================================
// EMAIL WORKER
// Processes email jobs and sends emails via Resend
// =============================================================================

import { Job } from 'bullmq';
import { registerWorker, QUEUE_NAMES, type EmailJobData } from '@/lib/queue';
import { env } from '@/config/env';
import { Resend } from 'resend';

// Initialize Resend client
const resend = new Resend(env.RESEND_API_KEY);

/**
 * Email templates
 * In production, these would be more sophisticated HTML templates
 */
const EMAIL_TEMPLATES: Record<string, (context: Record<string, unknown>) => { html: string; text: string }> = {
  // Issue notifications
  notification_issue_created: (ctx) => ({
    html: `
      <h2>Yeni Issue Oluşturuldu</h2>
      <p>Merhaba ${ctx.userName},</p>
      <p><strong>${ctx.issueKey}</strong>: ${ctx.issueSummary}</p>
      <p>Oluşturan: ${ctx.creatorName}</p>
      <a href="${ctx.issueUrl}">Issue'yu görüntüle</a>
    `,
    text: `Yeni Issue: ${ctx.issueKey} - ${ctx.issueSummary}`,
  }),
  
  notification_issue_assigned: (ctx) => ({
    html: `
      <h2>Size Issue Atandı</h2>
      <p>Merhaba ${ctx.userName},</p>
      <p><strong>${ctx.issueKey}</strong>: ${ctx.issueSummary}</p>
      <p>Atayan: ${ctx.assignerName}</p>
      <a href="${ctx.issueUrl}">Issue'yu görüntüle</a>
    `,
    text: `Issue Atandı: ${ctx.issueKey} - ${ctx.issueSummary}`,
  }),
  
  notification_issue_status_changed: (ctx) => ({
    html: `
      <h2>Issue Status Değişti</h2>
      <p>Merhaba ${ctx.userName},</p>
      <p><strong>${ctx.issueKey}</strong>: ${ctx.fromStatus} → ${ctx.toStatus}</p>
      <p>Değiştiren: ${ctx.changerName}</p>
      <a href="${ctx.issueUrl}">Issue'yu görüntüle</a>
    `,
    text: `Status Değişti: ${ctx.issueKey} - ${ctx.fromStatus} → ${ctx.toStatus}`,
  }),
  
  notification_issue_commented: (ctx) => ({
    html: `
      <h2>Yeni Yorum</h2>
      <p>Merhaba ${ctx.userName},</p>
      <p><strong>${ctx.issueKey}</strong> issue'suna yeni yorum eklendi.</p>
      <blockquote>${ctx.commentPreview}</blockquote>
      <p>Yazan: ${ctx.commenterName}</p>
      <a href="${ctx.issueUrl}">Issue'yu görüntüle</a>
    `,
    text: `Yeni Yorum: ${ctx.issueKey} - ${ctx.commentPreview}`,
  }),
  
  notification_issue_mentioned: (ctx) => ({
    html: `
      <h2>Bahsedildiniz</h2>
      <p>Merhaba ${ctx.userName},</p>
      <p><strong>${ctx.mentionerName}</strong> sizi <strong>${ctx.issueKey}</strong> issue'sunda bahsetti.</p>
      <a href="${ctx.issueUrl}">Issue'yu görüntüle</a>
    `,
    text: `Bahsedildiniz: ${ctx.issueKey}`,
  }),
  
  notification_comment_replied: (ctx) => ({
    html: `
      <h2>Yorumunuza Yanıt</h2>
      <p>Merhaba ${ctx.userName},</p>
      <p><strong>${ctx.replierName}</strong> yorumunuza yanıt verdi.</p>
      <blockquote>${ctx.replyPreview}</blockquote>
      <a href="${ctx.issueUrl}">Yanıtı görüntüle</a>
    `,
    text: `Yorumunuza Yanıt: ${ctx.replyPreview}`,
  }),
  
  notification_comment_mentioned: (ctx) => ({
    html: `
      <h2>Yorumda Bahsedildiniz</h2>
      <p>Merhaba ${ctx.userName},</p>
      <p><strong>${ctx.mentionerName}</strong> bir yorumda sizden bahsetti.</p>
      <a href="${ctx.issueUrl}">Yorumu görüntüle</a>
    `,
    text: `Yorumda Bahsedildiniz: ${ctx.issueKey}`,
  }),
  
  // Default fallback
  default: (ctx) => ({
    html: `
      <h2>${ctx.title || 'Bildirim'}</h2>
      <p>${ctx.message || ''}</p>
    `,
    text: `${ctx.title || 'Bildirim'}: ${ctx.message || ''}`,
  }),
};

/**
 * Process an email job
 */
async function processEmail(job: Job<EmailJobData>): Promise<void> {
  const { to, subject, template, context, from, replyTo, cc, bcc } = job.data;
  
  console.log(`[EmailWorker] Sending email to ${Array.isArray(to) ? to.join(', ') : to}`);
  
  // Get template
  const templateFn = EMAIL_TEMPLATES[template] || EMAIL_TEMPLATES.default;
  const { html, text } = templateFn(context);
  
  try {
    const result = await resend.emails.send({
      from: from || env.RESEND_SMTP_FROM || 'TaskMaster <noreply@taskmaster.local>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
      replyTo,
      cc,
      bcc,
    });
    
    if (result.error) {
      throw new Error(result.error.message);
    }
    
    console.log(`[EmailWorker] Email sent successfully, id: ${result.data?.id}`);
  } catch (error) {
    console.error('[EmailWorker] Failed to send email:', error);
    throw error; // Re-throw to trigger retry
  }
}

/**
 * Start the email worker
 */
export function startEmailWorker(): void {
  registerWorker<EmailJobData>(
    QUEUE_NAMES.EMAIL,
    processEmail,
    {
      concurrency: 5, // Process 5 emails concurrently
      limiter: {
        max: 10, // Max 10 emails
        duration: 1000, // Per second (rate limiting)
      },
    }
  );
  
  console.log('[EmailWorker] Started');
}
