export type WorkflowPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type WorkflowRecord = {
  id: string;
  workflowType: string;
  entityType: string;
  entityId: string;
  currentState: string;
  assignedTo: string | null;
  assignedRole: string | null;
  instituteId: string | null;
  universityId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  dueAt: string | null;
  overdue?: boolean;
  priority: WorkflowPriority | string;
  revision: number;
  metadata?: Record<string, unknown>;
  allowedActions?: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type WorkflowHistoryItem = {
  id: string;
  fromState: string;
  toState: string;
  action: string;
  performedBy: string | null;
  performedRole: string;
  reason: string | null;
  comments: string | null;
  timestamp: string;
};

export type ActionItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
  kind: string;
};

export type ActionCenter = {
  count: number;
  headline: string;
  items: ActionItem[];
};

export type WorkQueueSummary = {
  myTasks: number;
  unassignedTasks: number;
  overdueTasks: number;
  highPriorityTasks: number;
  recentlyCompleted: number;
  pendingRegistrations: number;
  note?: string;
};

export type DocumentChecklistItem = {
  documentType: string;
  name: string;
  required: boolean;
  instructions?: string;
  state: string;
  reviewStatus: string;
  fileStatus: string | null;
};
