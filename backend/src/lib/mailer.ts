import nodemailer, { type Transporter } from 'nodemailer';
import type { SenderRow } from '../types';

const transporters = new Map<number, Transporter>();

export function getTransporter(sender: SenderRow): Transporter {
  let t = transporters.get(sender.id);
  if (!t) {
    t = nodemailer.createTransport({
      host: sender.smtp_host,
      port: sender.smtp_port,
      secure: sender.smtp_secure,
      auth: { user: sender.smtp_user, pass: sender.smtp_pass },
      pool: true,
      maxConnections: 2,
    });
    transporters.set(sender.id, t);
  }
  return t;
}

export interface SendResult {
  messageId: string;
  previewUrl: string | null;
}

export async function sendMail(
  sender: SenderRow,
  msg: { to: string; subject: string; html: string; text: string; messageId: string },
): Promise<SendResult> {
  const info = await getTransporter(sender).sendMail({
    from: { name: sender.name, address: sender.email },
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
    messageId: msg.messageId,
  });
  const preview = nodemailer.getTestMessageUrl(info);
  return { messageId: info.messageId ?? msg.messageId, previewUrl: preview || null };
}

export function closeTransporters(): void {
  for (const t of transporters.values()) t.close();
  transporters.clear();
}
