export type UserRole = 'ADMIN' | 'COLLEGE';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING';
export type InstituteStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'REJECTED';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  phone?: string;
  instituteId?: string;
  universityId?: string;
  lastLoginAt?: string | null;
  passwordResetRequired?: boolean;
};

export type UniversityOption = {
  id: string;
  name: string;
  code: string | null;
  shortName: string;
  status?: string;
};

export type MasterData = {
  verification: string;
  exclusiveTypes: string[];
  locationTypes: string[];
  minorityTypes: string[];
  linguisticTypes: string[];
  collegeTypes: string[];
  districts: string[];
  jdRegions: string[];
  talukasByDistrict: Record<string, string[]>;
};

export type InstituteProfile = {
  id: string;
  university: UniversityOption;
  name: string;
  code: string | null;
  exclusiveType: string;
  locationType: string;
  minorityType: string;
  linguisticType: string;
  address: string;
  district: string;
  taluka: string;
  jdRegion: string;
  email: string;
  mobile: string;
  contactNumber1: string;
  contactNumber2: string;
  principalName: string;
  collegeType: string;
  status: InstituteStatus;
  rejectionReason?: string;
  correctionReason?: string;
  createdAt?: string;
  updatedAt?: string;
  studentCount?: { total: number; active: number; inactive: number };
};

export type AdminInstituteList = {
  items: InstituteProfile[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  pagination?: { page: number; limit: number; total: number; totalPages: number };
};

export type ChartSlice = { label: string; count: number };

export type OperationsSnapshot = {
  systemStatus: string;
  databaseStatus: string;
  storageStatus: string;
  pendingCollegeApprovals: number;
  recentFailedUploads: number;
  recentFailedJobs: number;
  recentErrorCount15m: number;
  failedLogins24h: number;
  recentErrors: Array<{
    timestamp: string;
    requestId?: string;
    route?: string;
    status: number;
    category: string;
    message: string;
  }>;
};

export type AdminDashboard = {
  universities: number;
  institutes: number;
  activeInstitutes: number;
  pendingInstitutes: number;
  rejectedInstitutes: number;
  students: number;
  activeStudents: number;
  inactiveStudents: number;
  notifications: { pendingRegistrations: number };
  charts: {
    institutesByStatus: ChartSlice[];
    studentsByAcademicYear: ChartSlice[];
    institutesByUniversity: ChartSlice[];
    studentsByUniversity?: ChartSlice[];
    studentsByDistrict?: ChartSlice[];
    insuranceByStatus?: ChartSlice[];
    paymentsByStatus?: ChartSlice[];
    documentsByStatus?: ChartSlice[];
  };
  recentActivity: Array<{
    id: string;
    action: string;
    entity: string;
    entityId?: string | null;
    user: { name: string; email: string };
    createdAt: string;
  }>;
  operations?: OperationsSnapshot;
  activeUniversities?: number;
  inactiveUniversities?: number;
  inactiveInstitutes?: number;
  stats?: Record<string, unknown>;
  submissions?: {
    total: number;
    byStatus: Record<string, number>;
    totalStudentsSubmitted: number;
    totalCalculatedPremium: number;
  };
};

export type AdminDashboardStats = AdminDashboard;

export type CollegeDashboard = {
  instituteStatus: InstituteStatus;
  university: UniversityOption;
  principal: string;
  students: { total: number; active: number; inactive: number; count: number; available: boolean; recentlyAdded?: number };
  insurance?: Record<string, number>;
  documents?: { total: number; pending: number; approved: number };
  payments?: { pending?: number; total?: number };
  ecards?: { generated?: number };
  pendingActions?: string[];
  actionItems?: Array<{ id: string; title: string; detail: string; href: string; kind: string }>;
  actionHeadline?: string;
  submissions?: {
    total: number;
    byStatus: Record<string, number>;
    totalStudentsSubmitted: number;
    totalCalculatedPremium: number;
  };
  charts?: {
    studentsByStatus?: ChartSlice[];
    monthlyStudents?: ChartSlice[];
    insuranceByStatus?: ChartSlice[];
    documentsPendingVsAvailable?: ChartSlice[];
  };
  note?: string;
};

export type PagedList<T> = {
  items: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastLogin: string | null;
  createdAt?: string;
};

export type AuditLogRow = {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  ipAddress?: string | null;
  user: { id: string; name: string; email: string } | null;
  result?: 'success' | 'failure' | 'info';
  requestId?: string | null;
  createdAt: string;
};

export type ReportSlice = { name: string; count: number };

export type AdminReports = {
  institutesByUniversity: ReportSlice[];
  institutesByDistrict: ReportSlice[];
  studentsByUniversity: ReportSlice[];
  studentsByInstitute: ReportSlice[];
  studentsByAcademicYear: ReportSlice[];
  schemeModules?: {
    universities: number;
    institutes: number;
    activeInstitutes: number;
    pendingRegistrations: number;
    students: number;
    insurance: { httpApi: boolean; records: number };
    documents: { httpApi: boolean; records: number };
    payments: { httpApi: boolean; records: number };
    reviews: { httpApi: boolean; records: number };
    ecards: { httpApi: boolean; records: number };
  };
};

export type SystemHealth = {
  application: {
    status: string;
    backend: string;
    frontend: string;
    api: string;
    version: string;
  };
  database: {
    connected: boolean;
    responseTimeMs: number;
    status: string;
  };
  storage: {
    configured: boolean;
    httpApi: string;
    upload: string;
    download: string;
    status: string;
  };
  email: {
    transportConfigured: boolean;
    implementation: string;
    failedSends?: number;
  };
  jobs: {
    backgroundProcessors: string;
    uploadPreviewTtl: string;
  };
  system: {
    lastSuccessfulHealthCheck: string | null;
    environment: string;
    uptimeSeconds: number;
    startedAt: string;
    maintenanceMode: boolean;
  };
  apiLatencyMs: number;
  featureFlags: Array<{ name: string; enabled: boolean }>;
};

export type StorageHealth = {
  connectivity: string;
  httpApi: string;
  configured: boolean;
  totalDocuments: number;
  recentUploads7d: number;
  recentFailures: number;
  missingFiles: number;
  byStatus: Record<string, number>;
  note: string;
};
