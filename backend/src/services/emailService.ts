import nodemailer, { type Transporter } from 'nodemailer';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { EmailLog } from '../models/EmailLog.js';
import { logger } from '../utils/logger.js';
import { renderTemplate } from '../notifications/template.js';
import { getOperationalSettings } from '../settings/settings.service.js';

let failedSends = 0;
let lastFailureAt: string | null = null;

export type EmailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

export type SendEmailInput = {
  to: string;
  cc?: string | string[];
  subject: string;
  text: string;
  attachments?: EmailAttachment[];
  template?: string;
  notificationType?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  /** Business mail such as a paid-premium pack. Still requires SMTP. */
  required?: boolean;
};

function transportReady(): boolean {
  return Boolean(env.SMTP_HOST);
}

let transport: Transporter | null = null;

function mailer() {
  if (!transport) {
    const port = env.SMTP_PORT || 587;
    transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined
    });
  }
  return transport;
}

export function isEmailTransportConfigured(): boolean {
  return transportReady();
}

async function persistLog(input: SendEmailInput, status: 'skipped' | 'sent' | 'failed', errorCode = '') {
  if (mongoose.connection.readyState !== 1) return;
  try {
    await EmailLog.create({
      recipient: input.to.slice(0, 200),
      template: input.template || '',
      notificationType: input.notificationType || '',
      provider: env.EMAIL_PROVIDER,
      status,
      subject: input.subject.slice(0, 200),
      sentAt: status === 'sent' ? new Date() : null,
      failedAt: status === 'failed' ? new Date() : null,
      errorCode,
      retryCount: 0,
      relatedEntityType: input.relatedEntityType || '',
      relatedEntityId: input.relatedEntityId || ''
    });
  } catch (error) {
    logger.error('email_log_failed', { message: error instanceof Error ? error.message : 'Unknown error' });
  }
}

export const emailService = {
  async sendEmail(input: SendEmailInput): Promise<{ status: 'skipped' | 'sent' | 'failed'; errorCode?: string }> {
    if (!input.required) {
      const settings = await getOperationalSettings();
      const enabled = settings.emailEnabled && env.EMAIL_ENABLED !== false;
      if (!enabled || !input.to) {
        await persistLog(input, 'skipped', 'EMAIL_DISABLED');
        return { status: 'skipped', errorCode: 'EMAIL_DISABLED' };
      }
    } else if (!input.to) {
      await persistLog(input, 'skipped', 'EMAIL_DISABLED');
      return { status: 'skipped', errorCode: 'EMAIL_DISABLED' };
    }
    if (!transportReady()) {
      failedSends += 1;
      lastFailureAt = new Date().toISOString();
      await persistLog(input, 'skipped', 'SMTP_NOT_CONFIGURED');
      if (env.NODE_ENV === 'production') {
        logger.error('email_send_failed', { reason: 'smtp_not_configured', retryCount: 0 });
      } else {
        logger.info('email_skipped', { reason: 'smtp_not_configured' });
      }
      return { status: 'skipped', errorCode: 'SMTP_NOT_CONFIGURED' };
    }
    try {
      await mailer().sendMail({
        from: env.SMTP_FROM || env.SMTP_USER || 'info@svyuvasuraksha.org',
        to: input.to,
        cc: input.cc || undefined,
        subject: input.subject,
        text: input.text,
        attachments: (input.attachments || []).map((file) => ({
          filename: file.filename,
          content: file.content,
          contentType: file.contentType
        }))
      });
      await persistLog(input, 'sent');
      return { status: 'sent' };
    } catch (error) {
      failedSends += 1;
      lastFailureAt = new Date().toISOString();
      const message = error instanceof Error ? error.message : 'send_failed';
      await persistLog(input, 'failed', message.slice(0, 80));
      logger.error('email_send_failed', { reason: message, retryCount: 0 });
      return { status: 'failed', errorCode: 'SEND_FAILED' };
    }
  },

  async sendTemplateEmail(input: {
    to: string;
    subject: string;
    body: string;
    vars?: Record<string, string | number | undefined | null>;
    template?: string;
    notificationType?: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
  }): Promise<{ status: 'skipped' | 'sent' | 'failed'; errorCode?: string }> {
    const vars = input.vars ?? {};
    return this.sendEmail({
      to: input.to,
      subject: renderTemplate(input.subject, vars),
      text: renderTemplate(input.body, vars),
      template: input.template,
      notificationType: input.notificationType,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId
    });
  },

  async sendBulkEmail(items: SendEmailInput[]): Promise<{ queued: number }> {
    let queued = 0;
    for (const item of items.slice(0, 200)) {
      await this.sendEmail(item);
      queued += 1;
    }
    return { queued };
  },

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: 'Password reset',
      text: `A password reset was requested. Open this link if you made the request: ${resetUrl}`,
      template: 'password_reset',
      notificationType: 'SYSTEM_ALERT'
    });
  },

  async retryFailed(limit = 50): Promise<{ retried: number }> {
    const rows = await EmailLog.find({ status: 'failed', retryCount: { $lt: 3 } })
      .sort({ createdAt: 1 })
      .limit(limit);
    let retried = 0;
    for (const row of rows) {
      const result = await this.sendEmail({
        to: row.recipient,
        subject: row.subject || 'Notification',
        text: 'Retry of a previously failed notification email. Details are in the portal.',
        template: row.template || undefined,
        notificationType: row.notificationType || undefined,
        relatedEntityType: row.relatedEntityType || undefined,
        relatedEntityId: row.relatedEntityId || undefined
      });
      row.retryCount = (row.retryCount || 0) + 1;
      if (result.status === 'sent') {
        row.status = 'sent';
        row.sentAt = new Date();
        row.errorCode = '';
      } else {
        row.errorCode = result.errorCode || row.errorCode;
      }
      await row.save();
      retried += 1;
    }
    return { retried };
  },

  stats() {
    return {
      transportConfigured: transportReady(),
      implementation: transportReady() ? 'nodemailer' : 'not_configured',
      provider: env.EMAIL_PROVIDER,
      failedSends,
      lastFailureAt
    };
  }
};
