import type {
  EmailCounts,
  EmailDetail,
  EmailListItem,
  EmailTab,
  Paginated,
  ScheduleRequest,
  ScheduleResponse,
  SendersResponse,
  SlackStatus,
  User,
} from './types';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      credentials: 'include',
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
  } catch {
    throw new ApiError(0, 'Could not reach the server. Is the backend running?');
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Request failed (${res.status})`);
  return data as T;
}

export const oauthUrls = {
  googleLogin: '/api/auth/google',
  slackConnect: '/api/slack/connect',
};

export const api = {
  me: () => request<{ user: User }>('/auth/me').then((r) => r.user),
  logout: () => request<{ ok: true }>('/auth/logout', { method: 'POST' }),

  senders: () => request<SendersResponse>('/senders'),

  listEmails: (tab: EmailTab, params: { q?: string; page?: number; pageSize?: number } = {}) => {
    const qs = new URLSearchParams({ status: tab });
    if (params.q) qs.set('q', params.q);
    if (params.page) qs.set('page', String(params.page));
    if (params.pageSize) qs.set('pageSize', String(params.pageSize));
    return request<Paginated<EmailListItem>>(`/emails?${qs.toString()}`);
  },
  emailCounts: () => request<EmailCounts>('/emails/counts'),
  getEmail: (id: string) => request<EmailDetail>(`/emails/${encodeURIComponent(id)}`),
  schedule: (body: ScheduleRequest) =>
    request<ScheduleResponse>('/emails/schedule', { method: 'POST', body: JSON.stringify(body) }),

  slackStatus: () => request<SlackStatus>('/slack/status'),
  slackDisconnect: () => request<{ ok: true }>('/slack', { method: 'DELETE' }),
  slackTest: () => request<{ ok: true }>('/slack/test', { method: 'POST' }),
};
