import axios, { type AxiosError } from 'axios';
import { getApiBaseUrl } from '../utils/apiBase';
import type { ApiFailure, ApiResponse, HealthPayload } from '../types/api';
import type {
  AuthUser,
  AdminDashboardStats,
  AdminInstituteList,
  AdminReports,
  AdminUserRow,
  AuditLogRow,
  CollegeDashboard,
  InstituteProfile,
  MasterData,
  PagedList,
  StorageHealth,
  SystemHealth,
  UniversityOption
} from '../types/auth';
import type { ExcelPreview, ImportResult, Pagination, StudentDetail, StudentList, StudentMeta } from '../types/student';
import type { AiAnalytics, AiChatResponse, AiLanguage, AiStatus, KnowledgeListItem } from '../types/ai';

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 20000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiFailure>) => {
    if (error.response?.status === 503 && error.response.data?.code === 'MAINTENANCE') {
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/maintenance')) {
        window.location.assign('/maintenance');
      }
    }
    const original = error.config as typeof error.config & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry) {
      const url = original.url ?? '';
      const skip = ['/api/auth/login', '/api/auth/signup', '/api/auth/refresh', '/api/auth/forgot-password', '/api/auth/reset-password'].some((path) =>
        url.includes(path)
      );
      if (skip) {
        return Promise.reject(error);
      }
      original._retry = true;
      try {
        await api.post('/api/auth/refresh');
        return api.request(original);
      } catch {
        if (typeof window !== 'undefined') {
          const path = window.location.pathname;
          const skipRedirect = ['/login', '/signup', '/forgot-password', '/reset-password', '/session-expired', '/network-error'].some((item) =>
            path.startsWith(item)
          );
          if (!skipRedirect && (path.startsWith('/admin') || path.startsWith('/college'))) {
            window.location.assign('/session-expired');
          }
        }
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiFailure | undefined;
    if (data?.code === 'MAINTENANCE') {
      return data.message;
    }
    if (data?.message) {
      return data.requestId ? `${data.message} Reference ID: ${data.requestId}` : data.message;
    }
    if (error.code === 'ERR_CANCELED') return 'Upload cancelled.';
    if (error.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
    if (error.code === 'ERR_NETWORK') return 'We could not reach the server. Check your connection and try again.';
  }
  return fallback;
}

export async function fetchHealth(): Promise<ApiResponse<HealthPayload>> {
  const response = await api.get<ApiResponse<HealthPayload>>('/api/health');
  return response.data;
}

export async function loginRequest(email: string, password: string, rememberMe = false): Promise<{ user: AuthUser; message: string }> {
  const response = await api.post<ApiResponse<{ user: AuthUser }>>('/api/auth/login', { email, password, rememberMe });
  if (!response.data.success) throw new Error(response.data.message);
  return { user: response.data.data.user, message: response.data.message };
}

export async function logoutRequest(): Promise<void> {
  await api.post('/api/auth/logout');
}

export async function fetchMe(): Promise<AuthUser> {
  const response = await api.get<ApiResponse<{ user: AuthUser }>>('/api/auth/me');
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data.user;
}

export async function signupRequest(payload: Record<string, unknown>): Promise<string> {
  const response = await api.post<ApiResponse<{ user: AuthUser }>>('/api/auth/signup', payload);
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.message;
}

export async function forgotPasswordRequest(email: string): Promise<string> {
  const response = await api.post<ApiResponse<null>>('/api/auth/forgot-password', { email });
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.message;
}

export async function resetPasswordRequest(token: string, password: string, confirmPassword: string): Promise<string> {
  const response = await api.post<ApiResponse<null>>('/api/auth/reset-password', { token, password, confirmPassword });
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.message;
}

export async function fetchUniversities(): Promise<UniversityOption[]> {
  const response = await api.get<ApiResponse<{ universities: UniversityOption[] }>>('/api/universities');
  if (!response.data.success) return [];
  return response.data.data.universities;
}

export async function fetchMasterData(): Promise<MasterData | null> {
  const response = await api.get<ApiResponse<MasterData>>('/api/master-data');
  if (!response.data.success) return null;
  return response.data.data;
}

export async function fetchCollegeProfile(): Promise<InstituteProfile> {
  const response = await api.get<ApiResponse<{ profile: InstituteProfile }>>('/api/college/profile');
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data.profile;
}

export async function updateCollegeProfile(payload: Record<string, string>): Promise<InstituteProfile> {
  const response = await api.patch<ApiResponse<{ profile: InstituteProfile }>>('/api/college/profile', payload);
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data.profile;
}

export async function fetchCollegeDashboard(): Promise<CollegeDashboard> {
  const response = await api.get<ApiResponse<{ dashboard: CollegeDashboard }>>('/api/college/dashboard');
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data.dashboard;
}

export async function fetchAdminDashboard(): Promise<AdminDashboardStats> {
  const response = await api.get<ApiResponse<AdminDashboardStats>>('/api/admin/dashboard');
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function fetchAdminUniversities(): Promise<UniversityOption[]> {
  const response = await api.get<ApiResponse<{ universities: UniversityOption[] }>>('/api/admin/universities/options');
  if (!response.data.success) return [];
  return response.data.data.universities;
}

export async function createUniversityRequest(payload: { name: string; code?: string; shortName?: string }): Promise<UniversityOption> {
  const response = await api.post<ApiResponse<{ university: UniversityOption }>>('/api/admin/universities', payload);
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data.university;
}

export async function fetchAdminInstitutes(params: Record<string, string | number | undefined>): Promise<AdminInstituteList> {
  const response = await api.get<ApiResponse<AdminInstituteList>>('/api/admin/institutes', { params });
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function fetchAdminInstitute(id: string): Promise<InstituteProfile> {
  const response = await api.get<ApiResponse<{ institute: InstituteProfile }>>(`/api/admin/institutes/${id}`);
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data.institute;
}

export async function approveInstituteRequest(id: string): Promise<InstituteProfile> {
  const response = await api.patch<ApiResponse<{ institute: InstituteProfile }>>(`/api/admin/institutes/${id}/approve`);
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data.institute;
}

export async function rejectInstituteRequest(id: string, reason: string): Promise<InstituteProfile> {
  const response = await api.patch<ApiResponse<{ institute: InstituteProfile }>>(`/api/admin/institutes/${id}/reject`, { reason });
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data.institute;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function fetchStudentMeta(): Promise<StudentMeta> {
  const response = await api.get<ApiResponse<StudentMeta>>('/api/college/students/meta');
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function fetchCollegeStudents(params: Record<string, string | number | undefined>): Promise<StudentList> {
  const response = await api.get<ApiResponse<StudentList>>('/api/college/students', { params });
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function fetchCollegeStudent(id: string): Promise<StudentDetail> {
  const response = await api.get<ApiResponse<{ student: StudentDetail }>>(`/api/college/students/${id}`);
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data.student;
}

export async function createCollegeStudent(payload: Record<string, unknown>): Promise<StudentDetail> {
  const response = await api.post<ApiResponse<{ student: StudentDetail }>>('/api/college/students', payload);
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data.student;
}

export async function updateCollegeStudent(id: string, payload: Record<string, unknown>): Promise<StudentDetail> {
  const response = await api.patch<ApiResponse<{ student: StudentDetail }>>(`/api/college/students/${id}`, payload);
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data.student;
}

export async function updateCollegeStudentStatus(id: string, status: 'ACTIVE' | 'INACTIVE'): Promise<StudentDetail> {
  const response = await api.patch<ApiResponse<{ student: StudentDetail }>>(`/api/college/students/${id}/status`, { status });
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data.student;
}

export async function downloadStudentTemplate(): Promise<void> {
  const response = await api.get('/api/college/students/template', { responseType: 'blob' });
  downloadBlob(new Blob([response.data]), 'SVYSY_Student_Upload_Template.xlsx');
}

export async function uploadStudentExcel(file: File, signal?: AbortSignal): Promise<ExcelPreview> {
  const form = new FormData();
  form.append('file', file);
  const response = await api.post<ApiResponse<ExcelPreview>>('/api/college/students/upload', form, {
    timeout: 60000,
    signal,
    transformRequest: [
      (data, headers) => {
        if (headers && typeof headers.delete === 'function') {
          headers.delete('Content-Type');
        }
        return data as FormData;
      }
    ]
  });
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function importStudentExcel(jobId: string): Promise<ImportResult> {
  const response = await api.post<ApiResponse<ImportResult>>('/api/college/students/import', { jobId });
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function downloadStudentImportErrors(jobId: string): Promise<void> {
  const response = await api.get(`/api/college/students/import/${jobId}/errors`, { responseType: 'blob' });
  downloadBlob(new Blob([response.data]), 'student_import_errors.xlsx');
}

export async function fetchAdminStudents(params: Record<string, string | number | undefined>): Promise<StudentList> {
  const response = await api.get<ApiResponse<StudentList>>('/api/admin/students', { params });
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function fetchAdminStudent(id: string): Promise<StudentDetail> {
  const response = await api.get<ApiResponse<{ student: StudentDetail }>>(`/api/admin/students/${id}`);
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data.student;
}

export async function updateAdminStudentStatus(id: string, status: 'ACTIVE' | 'INACTIVE'): Promise<StudentDetail> {
  const response = await api.patch<ApiResponse<{ student: StudentDetail }>>(`/api/admin/students/${id}/status`, { status });
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data.student;
}

export async function fetchAdminUniversityList(params: Record<string, string | number | undefined>): Promise<PagedList<UniversityOption & { createdAt?: string }>> {
  const response = await api.get<ApiResponse<PagedList<UniversityOption & { createdAt?: string }>>>('/api/admin/universities', { params });
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function updateUniversityRequest(id: string, payload: Record<string, string>): Promise<UniversityOption> {
  const response = await api.patch<ApiResponse<{ university: UniversityOption }>>(`/api/admin/universities/${id}`, payload);
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data.university;
}

export async function updateUniversityStatusRequest(id: string, status: 'ACTIVE' | 'INACTIVE'): Promise<UniversityOption> {
  const response = await api.patch<ApiResponse<{ university: UniversityOption }>>(`/api/admin/universities/${id}/status`, { status });
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data.university;
}

export async function updateInstituteStatusRequest(id: string, status: 'ACTIVE' | 'INACTIVE'): Promise<InstituteProfile> {
  const response = await api.patch<ApiResponse<{ institute: InstituteProfile }>>(`/api/admin/institutes/${id}/status`, { status });
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data.institute;
}

export async function fetchAdminRegistrations(params: Record<string, string | number | undefined>): Promise<AdminInstituteList> {
  const response = await api.get<ApiResponse<AdminInstituteList>>('/api/admin/registrations', { params });
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function fetchAdminReports(): Promise<AdminReports> {
  const response = await api.get<ApiResponse<AdminReports>>('/api/admin/reports');
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function fetchAuditLogs(params: Record<string, string | number | undefined>): Promise<PagedList<AuditLogRow>> {
  const response = await api.get<ApiResponse<PagedList<AuditLogRow>>>('/api/admin/audit-logs', { params });
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function fetchAdminUsers(params: Record<string, string | number | undefined>): Promise<PagedList<AdminUserRow>> {
  const response = await api.get<ApiResponse<PagedList<AdminUserRow>>>('/api/admin/users', { params });
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function updateAdminUserStatusRequest(id: string, status: 'ACTIVE' | 'INACTIVE'): Promise<AdminUserRow> {
  const response = await api.patch<ApiResponse<{ user: AdminUserRow }>>(`/api/admin/users/${id}/status`, { status });
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data.user;
}

export async function updateAdminProfileRequest(payload: { name?: string; phone?: string }): Promise<AuthUser> {
  const response = await api.patch<ApiResponse<{ user: AuthUser }>>('/api/admin/profile', payload);
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data.user;
}

export async function changePasswordRequest(currentPassword: string, newPassword: string, confirmPassword: string): Promise<string> {
  const response = await api.post<ApiResponse<null>>('/api/auth/change-password', { currentPassword, newPassword, confirmPassword });
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.message;
}

export async function fetchAdminSearch(q: string): Promise<{ institutes: Array<{ id: string; name: string; status: string; university: string }>; students: Array<{ id: string; name: string; studentId: string; institute: string }> }> {
  const response = await api.get<ApiResponse<{ institutes: Array<{ id: string; name: string; status: string; university: string }>; students: Array<{ id: string; name: string; studentId: string; institute: string }> }>>('/api/admin/search', { params: { q } });
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function fetchSystemHealth(): Promise<SystemHealth> {
  const response = await api.get<ApiResponse<SystemHealth>>('/api/admin/system-health');
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function fetchStorageHealth(): Promise<StorageHealth> {
  const response = await api.get<ApiResponse<StorageHealth>>('/api/admin/storage-health');
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function fetchAdminSupport(q: string) {
  const response = await api.get<
    ApiResponse<{
      users: Array<{ id: string; name: string; email: string; role: string; status: string; lastLoginAt: string | null }>;
      institutes: Array<{ id: string; name: string; email: string; status: string; district: string }>;
      students: Array<{ id: string; studentId: string; enrollmentNumber: string; name: string; status: string }>;
      recentFailedOperations: Array<{
        id: string;
        action: string;
        entity: string;
        entityId?: string | null;
        createdAt: string;
        user: { name: string; email: string } | null;
        requestId: string;
      }>;
    }>
  >('/api/admin/support', { params: { q } });
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function fetchLoginActivity(params: Record<string, string | number | undefined>) {
  const response = await api.get<
    ApiResponse<
      PagedList<{
        id: string;
        user: { id: string; name: string; email: string } | null;
        timestamp: string;
        success: boolean;
        action: string;
        requestId: string | null;
      }>
    >
  >('/api/admin/login-activity', { params });
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function fetchInactiveAccounts(inactiveDays?: number) {
  const response = await api.get<
    ApiResponse<{
      inactiveDays: number;
      autoDisable: boolean;
      items: Array<{ id: string; name: string; email: string; role: string; status: string; lastLoginAt: string | null }>;
    }>
  >('/api/admin/accounts/inactive', { params: { inactiveDays } });
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function submitDataCorrection(payload: {
  entity: 'Student' | 'Institute' | 'User';
  entityId: string;
  field: string;
  value: string;
  reason: string;
}) {
  const response = await api.post<ApiResponse<{ entity: string; entityId: string; field: string; oldValue: string; newValue: string }>>(
    '/api/admin/corrections',
    payload
  );
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function downloadAdminExport(path: 'institutes' | 'students', params: Record<string, string | undefined> = {}, format: 'csv' | 'xlsx' = 'csv'): Promise<void> {
  const response = await api.get(`/api/admin/${path}/export`, { params: { ...params, format }, responseType: 'blob' });
  downloadBlob(new Blob([response.data]), `${path}.${format}`);
}

export async function fetchAiStatus(): Promise<AiStatus> {
  const response = await api.get<ApiResponse<AiStatus>>('/api/ai/status');
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function sendAiChat(payload: { question: string; conversationId?: string; language?: AiLanguage }): Promise<AiChatResponse> {
  const response = await api.post<ApiResponse<AiChatResponse>>('/api/ai/chat', payload, { timeout: 45000 });
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function sendAiFeedback(payload: {
  conversationId: string;
  messageId: string;
  rating: 'helpful' | 'not_helpful';
  comment?: string;
}): Promise<void> {
  const response = await api.post<ApiResponse<{ id: string }>>('/api/ai/feedback', payload);
  if (!response.data.success) throw new Error(response.data.message);
}

export async function fetchKnowledgeDocuments(params: Record<string, string | number | undefined> = {}): Promise<{
  items: KnowledgeListItem[];
  pagination: PagedList<KnowledgeListItem>['pagination'] | { page: number; limit: number; total: number; totalPages: number };
}> {
  const response = await api.get<
    ApiResponse<{
      items: KnowledgeListItem[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>
  >('/api/ai/knowledge', { params });
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function uploadKnowledgeDocument(input: {
  file: File;
  title: string;
  source: string;
  version: string;
  accessScope: string;
}): Promise<{ id: string; status: string }> {
  const form = new FormData();
  form.append('file', input.file);
  form.append('title', input.title);
  form.append('source', input.source);
  form.append('version', input.version);
  form.append('accessScope', input.accessScope);
  const response = await api.post<ApiResponse<{ id: string; status: string }>>('/api/ai/knowledge', form, {
    timeout: 60000,
    transformRequest: [
      (data, headers) => {
        if (headers && typeof headers.delete === 'function') {
          headers.delete('Content-Type');
        }
        return data as FormData;
      }
    ]
  });
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function updateKnowledgeStatus(id: string, status: 'ACTIVE' | 'ARCHIVED' | 'DRAFT'): Promise<void> {
  const response = await api.patch<ApiResponse<{ id: string; status: string }>>(`/api/ai/knowledge/${id}/status`, { status });
  if (!response.data.success) throw new Error(response.data.message);
}

export async function reprocessKnowledgeDocument(id: string): Promise<void> {
  const response = await api.post<ApiResponse<{ id: string; status?: string }>>(`/api/ai/knowledge/${id}/reprocess`);
  if (!response.data.success) throw new Error(response.data.message);
}

export async function fetchAiAnalytics(): Promise<AiAnalytics> {
  const response = await api.get<ApiResponse<AiAnalytics>>('/api/ai/analytics');
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function fetchAdminAnalytics(params: Record<string, string | undefined> = {}) {
  const response = await api.get<ApiResponse<Record<string, unknown>>>('/api/admin/dashboard/analytics', { params });
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function fetchAdminInsights() {
  const response = await api.get<ApiResponse<{ attention: string[]; summary: string; aiUsed: boolean }>>('/api/admin/dashboard/insights');
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function fetchCollegeInsights() {
  const response = await api.get<ApiResponse<{ attention: string[]; summary: string; aiUsed: boolean }>>('/api/college/dashboard/insights');
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function fetchNotifications(params: Record<string, string | number | boolean | undefined> = {}) {
  const response = await api.get<ApiResponse<{ items: import('../types/notifications').NotificationItem[]; unreadCount: number; pagination: { page: number; limit: number; total: number; totalPages: number } }>>(
    '/api/notifications',
    { params }
  );
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function fetchUnreadNotifications() {
  const response = await api.get<ApiResponse<{ unreadCount: number; recent: import('../types/notifications').NotificationItem[]; pollSeconds: number }>>(
    '/api/notifications/unread'
  );
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function markNotificationRead(id: string) {
  const response = await api.patch<ApiResponse<{ notification: import('../types/notifications').NotificationItem }>>(`/api/notifications/${id}/read`);
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data.notification;
}

export async function markAllNotificationsRead() {
  await api.post('/api/notifications/read-all');
}

export async function fetchNotificationPreferences() {
  const response = await api.get<ApiResponse<{ notifyInApp: boolean; notifyEmail: boolean; criticalAlwaysOn: string[] }>>('/api/notifications/preferences');
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function updateNotificationPreferences(payload: { notifyInApp?: boolean; notifyEmail?: boolean }) {
  const response = await api.patch<ApiResponse<{ notifyInApp: boolean; notifyEmail: boolean }>>('/api/notifications/preferences', payload);
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function fetchAnnouncements(params: Record<string, string | number | undefined> = {}) {
  const response = await api.get<ApiResponse<{ items: import('../types/notifications').AnnouncementItem[]; pagination: { page: number; total: number; totalPages: number } }>>(
    '/api/admin/announcements',
    { params }
  );
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function createAnnouncementRequest(payload: Record<string, unknown>) {
  const response = await api.post<ApiResponse<{ announcement: import('../types/notifications').AnnouncementItem }>>('/api/admin/announcements', payload);
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data.announcement;
}

export async function publishAnnouncementRequest(id: string) {
  const response = await api.post<ApiResponse<{ announcement: import('../types/notifications').AnnouncementItem }>>(`/api/admin/announcements/${id}/publish`);
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data.announcement;
}

export async function unpublishAnnouncementRequest(id: string) {
  const response = await api.post<ApiResponse<{ announcement: import('../types/notifications').AnnouncementItem }>>(`/api/admin/announcements/${id}/unpublish`);
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data.announcement;
}

export async function fetchSystemJobs() {
  const response = await api.get<ApiResponse<{ items: import('../types/notifications').JobItem[] }>>('/api/admin/system-jobs');
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data.items;
}

export async function retrySystemJob(name: string) {
  const response = await api.post<ApiResponse<{ name: string; status: string }>>(`/api/admin/system-jobs/${encodeURIComponent(name)}/retry`);
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function fetchOperationalSettings() {
  const response = await api.get<ApiResponse<{ items: Array<{ key: string; value: unknown; note?: string }>; pollSeconds: number }>>(
    '/api/admin/operational-settings'
  );
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function updateOperationalSettings(payload: Record<string, unknown>) {
  const response = await api.patch('/api/admin/operational-settings', payload);
  if (!response.data.success) throw new Error(response.data.message);
}

export async function fetchTemplates() {
  const response = await api.get<ApiResponse<{ items: Array<{ id: string; name: string; type: string; channel: string; language: string; subject: string; body: string; active: boolean }>; allowedVariables: string[] }>>(
    '/api/admin/notification-templates'
  );
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function saveTemplate(payload: Record<string, unknown>) {
  const response = await api.put('/api/admin/notification-templates', payload);
  if (!response.data.success) throw new Error(response.data.message);
}

export async function fetchTimeline(role: 'ADMIN' | 'COLLEGE', kind: 'institutes' | 'students', id: string) {
  const path = role === 'ADMIN' ? `/api/admin/${kind}/${id}/timeline` : `/api/college/students/${id}/timeline`;
  const response = await api.get<ApiResponse<{ items: import('../types/notifications').TimelineItem[] }>>(path);
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data.items;
}

export async function fetchReportPreview(role: 'ADMIN' | 'COLLEGE', params: Record<string, string | undefined>) {
  const path = role === 'ADMIN' ? '/api/admin/reports/preview' : '/api/college/reports/preview';
  const response = await api.get<ApiResponse<{ headers: string[]; preview: unknown[][]; rowCount: number; truncated: boolean; pdfSupported: boolean }>>(
    path,
    { params }
  );
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function downloadReport(role: 'ADMIN' | 'COLLEGE', params: Record<string, string | undefined>, format: 'csv' | 'xlsx') {
  const path = role === 'ADMIN' ? '/api/admin/reports/export' : '/api/college/reports/export';
  const response = await api.get(path, { params: { ...params, format }, responseType: 'blob' });
  downloadBlob(new Blob([response.data]), `report-${params.category || 'export'}.${format}`);
}

export async function fetchSchemeRecords(
  role: 'ADMIN' | 'COLLEGE',
  kind: 'insurance' | 'documents' | 'payments' | 'ecards',
  params: Record<string, string | number | undefined> = {}
) {
  const prefix = role === 'ADMIN' ? '/api/admin' : '/api/college';
  const response = await api.get<ApiResponse<import('../types/scheme').SchemeRecordList>>(`${prefix}/${kind}`, { params });
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function requestDocumentUpload(file: File): Promise<void> {
  const form = new FormData();
  form.append('file', file);
  const response = await api.post<ApiResponse<null>>('/api/college/documents', form, {
    timeout: 30000,
    transformRequest: [
      (data, headers) => {
        if (headers && typeof headers.delete === 'function') {
          headers.delete('Content-Type');
        }
        return data as FormData;
      }
    ]
  });
  if (!response.data.success) throw new Error(response.data.message);
}

export async function fetchPushStatus() {
  const response = await api.get<ApiResponse<{ enabled: boolean; permissionRequired: boolean; note?: string }>>('/api/notifications/push/status');
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function fetchWorkQueue(params: Record<string, string | number | undefined>) {
  const response = await api.get<ApiResponse<{ items: import('../types/workflow').WorkflowRecord[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>>('/api/admin/work-queue', { params });
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function fetchWorkQueueSummary() {
  const response = await api.get<ApiResponse<import('../types/workflow').WorkQueueSummary>>('/api/admin/work-queue/summary');
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function assignWorkQueueBulk(ids: string[], assignedUserId: string) {
  const response = await api.post<ApiResponse<{ assigned: number }>>('/api/admin/work-queue/assign-bulk', { ids, assignedUserId });
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function fetchWorkflow(role: 'ADMIN' | 'COLLEGE', id: string) {
  const prefix = role === 'ADMIN' ? '/api/admin' : '/api/college';
  const response = await api.get<ApiResponse<{ workflow: import('../types/workflow').WorkflowRecord }>>(`${prefix}/workflows/${id}`);
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data.workflow;
}

export async function fetchEntityWorkflow(role: 'ADMIN' | 'COLLEGE', workflowType: string, entityId: string) {
  const prefix = role === 'ADMIN' ? '/api/admin' : '/api/college';
  const response = await api.get<ApiResponse<{ workflow: import('../types/workflow').WorkflowRecord }>>(`${prefix}/workflows/entity/${workflowType}/${entityId}`);
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data.workflow;
}

export async function fetchWorkflowHistory(role: 'ADMIN' | 'COLLEGE', id: string) {
  const prefix = role === 'ADMIN' ? '/api/admin' : '/api/college';
  const response = await api.get<ApiResponse<{ items: import('../types/workflow').WorkflowHistoryItem[] }>>(`${prefix}/workflows/${id}/history`);
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data.items;
}

export async function postWorkflowAction(role: 'ADMIN' | 'COLLEGE', id: string, payload: { action: string; reason?: string; comments?: string; expectedRevision?: number; expectedState?: string }) {
  const prefix = role === 'ADMIN' ? '/api/admin' : '/api/college';
  const response = await api.post<ApiResponse<{ workflow: import('../types/workflow').WorkflowRecord }>>(`${prefix}/workflows/${id}/actions`, payload);
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data.workflow;
}

export async function fetchActionCenter() {
  const response = await api.get<ApiResponse<import('../types/workflow').ActionCenter>>('/api/college/action-center');
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function fetchCollegeSubmissionMeta() {
  const response = await api.get<ApiResponse<import('../types/submission').SubmissionMeta>>('/api/college/submissions/meta');
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function fetchCollegeSubmissions(params: Record<string, string | number | undefined>) {
  const response = await api.get<ApiResponse<PagedList<import('../types/submission').SubmissionSummary>>>('/api/college/submissions', { params });
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function createCollegeSubmission(academicYear: string) {
  const response = await api.post<ApiResponse<{ submission: import('../types/submission').SubmissionSummary }>>('/api/college/submissions', { academicYear });
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data.submission;
}

export async function fetchCollegeSubmission(id: string) {
  const response = await api.get<ApiResponse<{ submission: import('../types/submission').SubmissionDetail }>>(`/api/college/submissions/${id}`);
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data.submission;
}

export async function uploadCollegeSubmissionExcel(id: string, file: File, signal?: AbortSignal) {
  const form = new FormData();
  form.append('file', file);
  const response = await api.post<ApiResponse<{
    filename: string;
    sizeBytes: number;
    uploadStatus: string;
    validationStatus: string;
    totalRows: number;
    valid: number;
    invalid: number;
    duplicates: number;
    issues: import('../types/student').ExcelIssue[];
  }>>(`/api/college/submissions/${id}/upload`, form, {
    timeout: 60000,
    signal,
    transformRequest: [
      (data, headers) => {
        if (headers && typeof headers.delete === 'function') headers.delete('Content-Type');
        return data as FormData;
      }
    ]
  });
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function fetchSubmissionPreview(role: 'ADMIN' | 'COLLEGE', id: string, params: Record<string, string | number | undefined>) {
  const prefix = role === 'ADMIN' ? '/api/admin' : '/api/college';
  const response = await api.get<ApiResponse<{ items: import('../types/submission').PreviewRow[]; pagination: Pagination }>>(`${prefix}/submissions/${id}/preview`, { params });
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function downloadSubmissionErrors(role: 'ADMIN' | 'COLLEGE', id: string) {
  const prefix = role === 'ADMIN' ? '/api/admin' : '/api/college';
  const response = await api.get(`${prefix}/submissions/${id}/errors`, { responseType: 'blob' });
  downloadBlob(new Blob([response.data]), 'submission_validation_errors.xlsx');
}

export async function confirmCollegeSubmission(id: string) {
  const response = await api.post<ApiResponse<{ studentCount: number; status: string }>>(`/api/college/submissions/${id}/confirm`);
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function calculateCollegePremium(id: string) {
  const response = await api.post<ApiResponse<{ premium: import('../types/submission').PremiumDto }>>(`/api/college/submissions/${id}/calculate-premium`);
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data.premium;
}

export async function submitCollegeSubmission(id: string) {
  const response = await api.post<ApiResponse<{ submission: import('../types/submission').SubmissionSummary }>>(`/api/college/submissions/${id}/submit`, {
    declarationAccepted: true
  });
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data.submission;
}

export async function fetchAdminSubmissions(params: Record<string, string | number | undefined>) {
  const response = await api.get<ApiResponse<PagedList<import('../types/submission').SubmissionSummary>>>('/api/admin/submissions', { params });
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function fetchAdminSubmission(id: string) {
  const response = await api.get<ApiResponse<{ submission: import('../types/submission').SubmissionDetail }>>(`/api/admin/submissions/${id}`);
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data.submission;
}

export async function fetchAdminSubmissionSummary() {
  const response = await api.get<ApiResponse<import('../types/submission').SubmissionStats>>('/api/admin/submissions/summary');
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}

export async function reviewAdminSubmission(id: string, action: string, reason?: string) {
  const response = await api.post<ApiResponse<{ submission: import('../types/submission').SubmissionSummary }>>(`/api/admin/submissions/${id}/review`, {
    action,
    ...(reason ? { reason } : {})
  });
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data.submission;
}

export async function downloadAdminSubmissionsExport(format: 'csv' | 'xlsx', params: Record<string, string | undefined>) {
  const response = await api.get('/api/admin/submissions/export', { params: { ...params, format }, responseType: 'blob' });
  downloadBlob(new Blob([response.data]), format === 'xlsx' ? 'submissions.xlsx' : 'submissions.csv');
}

export async function fetchAdminPremiumRules(academicYear?: string) {
  const response = await api.get<ApiResponse<{ items: Array<{ id: string; academicYear: string; version: string; active: boolean; ratePerStudent: number | null }> }>>('/api/admin/premium-rules', { params: { academicYear } });
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data.items;
}

export async function saveAdminPremiumRule(payload: { academicYear: string; version: string; ratePerStudent: number; active: boolean }) {
  const response = await api.put<ApiResponse<{ rule: { id: string } }>>('/api/admin/premium-rules', payload);
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data.rule;
}

export async function fetchDocumentChecklist(role: 'ADMIN' | 'COLLEGE', workflowType = 'INSTITUTE_REGISTRATION') {
  const prefix = role === 'ADMIN' ? '/api/admin' : '/api/college';
  const response = await api.get<ApiResponse<{ note?: string; items: import('../types/workflow').DocumentChecklistItem[] }>>(`${prefix}/document-checklist`, { params: { workflowType } });
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}



