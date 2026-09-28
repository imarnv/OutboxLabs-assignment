export type EmailStatus = 'scheduled' | 'sending' | 'sent' | 'failed';
export type EmailTab = 'scheduled' | 'sent';

export interface User {
  id: number;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface Sender {
  id: number;
  email: string;
  name: string;
}

export interface SendingLimits {
  minDelayBetweenSendsMs: number;
  maxEmailsPerHourPerSender: number;
  maxEmailsPerHourGlobal: number;
  workerConcurrency: number;
}

export interface SendersResponse {
  senders: Sender[];
  limits: SendingLimits;
}

export interface EmailListItem {
  id: string;
  campaignId: number;
  recipient: string;
  subject: string;
  bodyPreview: string;
  status: EmailStatus;
  scheduledAt: string;
  sentAt: string | null;
  failedAt: string | null;
  error: string | null;
  sender: Sender;
}

export interface EmailDetail extends EmailListItem {
  body: string;
  previewUrl: string | null;
  messageId: string | null;
  attempts: number;
  rateLimitedCount: number;
  attachments: AttachmentMeta[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type EmailCounts = Record<EmailTab, number>;

export interface ScheduleRequest {
  senderId: number;
  subject: string;
  body: string;
  recipients: string[];
  startTime: string;
  delayBetweenSeconds: number;
  hourlyLimit: number;
  attachments: AttachmentUpload[];
}

export interface AttachmentUpload {
  filename: string;
  contentType: string;
  contentBase64: string;
}

export interface AttachmentMeta {
  id: number;
  filename: string;
  contentType: string;
  size: number;
}

export interface ScheduleResponse {
  campaignId: number;
  scheduled: number;
  duplicatesRemoved: number;
  firstScheduledAt: string | null;
  lastScheduledAt: string | null;
}

export interface SlackStatus {
  configured: boolean;
  connected: boolean;
  teamName: string | null;
  channel: string | null;
}
