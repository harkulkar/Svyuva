export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  status: string;
  readAt: string | null;
  relatedEntityType: string;
  relatedEntityId: string;
  actionUrl: string;
  createdAt: string;
  expiresAt: string | null;
};

export type TimelineItem = {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  createdAt: string;
};

export type AnnouncementItem = {
  id: string;
  title: string;
  body: string;
  language: string;
  status: string;
  audienceType: string;
  audienceRole?: string;
  publishAt?: string | null;
  expiresAt?: string | null;
  fanoutStatus?: string;
};

export type JobItem = {
  name: string;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  status: string;
  successCount: number;
  failureCount: number;
  lastError?: string;
  lastDurationMs?: number;
  retryable: boolean;
};
