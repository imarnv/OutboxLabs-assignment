export type EmailStatus = 'scheduled' | 'sending' | 'sent' | 'failed';

export interface UserRow {
  id: number;
  google_id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  created_at: Date;
}

export interface SenderRow {
  id: number;
  email: string;
  name: string;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_pass: string;
  created_at: Date;
}

export interface CampaignRow {
  id: number;
  user_id: number;
  sender_id: number;
  subject: string;
  body: string;
  start_time: Date;
  delay_between_ms: number;
  hourly_limit: number;
  created_at: Date;
}

export interface EmailRow {
  id: string; // BIGSERIAL comes back as string from pg
  campaign_id: number;
  user_id: number;
  sender_id: number;
  recipient: string;
  subject: string;
  body: string;
  scheduled_at: Date;
  status: EmailStatus;
  attempts: number;
  rate_limited_count: number;
  locked_at: Date | null;
  sent_at: Date | null;
  failed_at: Date | null;
  error: string | null;
  message_id: string | null;
  preview_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface SlackConnectionRow {
  user_id: number;
  team_id: string | null;
  team_name: string | null;
  channel: string | null;
  channel_id: string | null;
  webhook_url: string;
  access_token: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface SendEmailJobData {
  emailId: string;
}

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  avatarUrl: string | null;
}
