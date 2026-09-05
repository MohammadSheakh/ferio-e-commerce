import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { StructuredLogger } from '@app/common';
import { QUEUE_NAMES } from '../bullmq.constants';
import { EmailService } from '../../../features/authentication/email/email.service';

type EmailJobData = {
  email?: unknown;
  otp?: unknown;
  type?: unknown;
  name?: unknown;
  token?: unknown;
  purpose?: unknown;
};

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`EMAIL_JOB_INVALID_FIELD:${field}`);
  }
  return value;
}

/**
 * Email Processor
 *
 * 📧 BULLMQ WORKER FOR ASYNC EMAIL PROCESSING
 *
 * Updated to use WorkerHost (compatible with @nestjs/bullmq v11)
 */
@Processor(QUEUE_NAMES.EMAIL)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new StructuredLogger(EmailProcessor.name);

  constructor(private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job<EmailJobData, unknown, string>): Promise<unknown> {
    this.logger.log('email_job_started', { jobId: job.id, jobName: job.name });

    try {
      switch (job.name) {
        case 'send-otp-email':
          return await this.emailService.sendOtpEmailNow(
            requiredString(job.data.email, 'email'),
            requiredString(job.data.otp, 'otp'),
            requiredString(job.data.type, 'type') as Parameters<EmailService['sendOtpEmailNow']>[2],
          );
        case 'send-welcome-email':
          return await this.emailService.sendWelcomeEmailNow(
            requiredString(job.data.email, 'email'),
            requiredString(job.data.name, 'name'),
          );
        case 'send-password-reset-confirmation':
          return await this.emailService.sendPasswordResetConfirmationNow(
            requiredString(job.data.email, 'email'),
          );
        case 'send-staff-access-email':
          return await this.emailService.sendStaffAccessEmailNow(
            requiredString(job.data.email, 'email'),
            requiredString(job.data.token, 'token'),
            requiredString(job.data.purpose, 'purpose'),
          );
        case 'send-task-notification':
          throw new Error(`EMAIL_JOB_NOT_IMPLEMENTED:${job.name}`);
        default:
          throw new Error(`EMAIL_JOB_UNKNOWN:${job.name}`);
      }
    } catch (err: unknown) {
      this.logger.error('email_job_failed', {
        jobId: job.id,
        jobName: job.name,
        errorName: err instanceof Error ? err.name : 'UnknownError',
      });
      throw err;
    }
  }
}
