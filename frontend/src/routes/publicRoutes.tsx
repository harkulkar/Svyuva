import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { PublicLayout } from '../components/layout/PublicLayout';
import { GuestOnly, RoleProtectedRoute } from '../components/ProtectedRoute';
import { AdminLayout, CollegeLayout } from '../components/layout/PortalLayout';
import { Loading } from '../components/common/Loading';
import { ForgotPasswordPage } from '../pages/auth/ForgotPassword';
import { LoginPage } from '../pages/auth/Login';
import { ResetPasswordPage } from '../pages/auth/ResetPassword';
import { SignupPage } from '../pages/auth/Signup';
import { ForbiddenPage, MaintenancePage, NetworkErrorPage, NotFoundPage, ServerErrorPage, SessionExpiredPage } from '../pages/errors/StatusPages';
import { About } from '../pages/public/About';
import { Contact } from '../pages/public/Contact';
import { Documents } from '../pages/public/Documents';
import { Downloads } from '../pages/public/Downloads';
import { FAQ } from '../pages/public/FAQ';
import { Home } from '../pages/public/Home';
import { IciciDocument } from '../pages/public/IciciDocument';
import { ImplementingBody } from '../pages/public/ImplementingBody';
import { Insurance } from '../pages/public/Insurance';
import { MediclaimCoverage } from '../pages/public/MediclaimCoverage';
import { NationalDocument } from '../pages/public/NationalDocument';
import { NodalAgency } from '../pages/public/NodalAgency';
import { PersonalAccidents } from '../pages/public/PersonalAccidents';
import { PolicyPageView, WebsitePolicies } from '../pages/public/Policies';
import { Press } from '../pages/public/Press';
import { Scheme } from '../pages/public/Scheme';
import { UsefulLinks } from '../pages/public/UsefulLinks';

const AdminDashboardPage = lazy(() => import('../pages/admin/Dashboard').then((m) => ({ default: m.AdminDashboardPage })));
const AdminWorkQueuePage = lazy(() => import('../pages/admin/WorkQueue').then((m) => ({ default: m.AdminWorkQueuePage })));
const AdminInstituteDetailPage = lazy(() => import('../pages/admin/InstituteDetail').then((m) => ({ default: m.AdminInstituteDetailPage })));
const AdminInstitutesPage = lazy(() => import('../pages/admin/Institutes').then((m) => ({ default: m.AdminInstitutesPage })));
const AdminUniversitiesPage = lazy(() => import('../pages/admin/Universities').then((m) => ({ default: m.AdminUniversitiesPage })));
const AdminStudentsPage = lazy(() => import('../pages/admin/Students').then((m) => ({ default: m.AdminStudentsPage })));
const AdminStudentDetailPage = lazy(() => import('../pages/admin/StudentDetail').then((m) => ({ default: m.AdminStudentDetailPage })));
const AdminRegistrationsPage = lazy(() => import('../pages/admin/Registrations').then((m) => ({ default: m.AdminRegistrationsPage })));
const AdminReportsPage = lazy(() => import('../pages/admin/Reports').then((m) => ({ default: m.AdminReportsPage })));
const AdminAuditLogsPage = lazy(() => import('../pages/admin/AuditLogs').then((m) => ({ default: m.AdminAuditLogsPage })));
const AdminUsersPage = lazy(() => import('../pages/admin/Users').then((m) => ({ default: m.AdminUsersPage })));
const AdminProfilePage = lazy(() => import('../pages/admin/Profile').then((m) => ({ default: m.AdminProfilePage })));
const AdminSettingsPage = lazy(() => import('../pages/admin/Profile').then((m) => ({ default: m.AdminSettingsPage })));
const AdminSystemHealthPage = lazy(() => import('../pages/admin/SystemHealth').then((m) => ({ default: m.AdminSystemHealthPage })));
const AdminStorageHealthPage = lazy(() => import('../pages/admin/StorageHealth').then((m) => ({ default: m.AdminStorageHealthPage })));
const AdminSupportPage = lazy(() => import('../pages/admin/Support').then((m) => ({ default: m.AdminSupportPage })));
const AdminLoginActivityPage = lazy(() => import('../pages/admin/LoginActivity').then((m) => ({ default: m.AdminLoginActivityPage })));
const CollegeSubmissionsPage = lazy(() => import('../pages/college/Submissions').then((m) => ({ default: m.CollegeSubmissionsPage })));
const CollegeNewSubmissionPage = lazy(() => import('../pages/college/Submissions').then((m) => ({ default: m.CollegeNewSubmissionPage })));
const CollegeSubmissionDetailPage = lazy(() => import('../pages/college/SubmissionFlow').then((m) => ({ default: m.CollegeSubmissionDetailPage })));
const CollegeSubmissionUploadPage = lazy(() => import('../pages/college/SubmissionFlow').then((m) => ({ default: m.CollegeSubmissionUploadPage })));
const CollegeSubmissionPreviewPage = lazy(() => import('../pages/college/SubmissionFlow').then((m) => ({ default: m.CollegeSubmissionPreviewPage })));
const CollegeSubmissionPremiumPage = lazy(() => import('../pages/college/SubmissionFlow').then((m) => ({ default: m.CollegeSubmissionPremiumPage })));
const CollegeSubmissionReviewPage = lazy(() => import('../pages/college/SubmissionFlow').then((m) => ({ default: m.CollegeSubmissionReviewPage })));
const AdminSubmissionsPage = lazy(() => import('../pages/admin/Submissions').then((m) => ({ default: m.AdminSubmissionsPage })));
const AdminSubmissionDetailPage = lazy(() => import('../pages/admin/Submissions').then((m) => ({ default: m.AdminSubmissionDetailPage })));
const CollegeDashboardPage = lazy(() => import('../pages/college/Dashboard').then((m) => ({ default: m.CollegeDashboardPage })));
const CollegeComingSoon = lazy(() => import('../pages/college/Dashboard').then((m) => ({ default: m.CollegeComingSoon })));
const CollegeModuleRecordsPage = lazy(() => import('../pages/portal/ModuleRecords').then((m) => ({ default: m.CollegeModuleRecordsPage })));
const AdminModuleRecordsPage = lazy(() => import('../pages/portal/ModuleRecords').then((m) => ({ default: m.AdminModuleRecordsPage })));
const CollegeProfilePage = lazy(() => import('../pages/college/Profile').then((m) => ({ default: m.CollegeProfilePage })));
const CollegeStudentsPage = lazy(() => import('../pages/college/Students').then((m) => ({ default: m.CollegeStudentsPage })));
const CollegeAddStudentPage = lazy(() => import('../pages/college/AddStudent').then((m) => ({ default: m.CollegeAddStudentPage })));
const CollegeEditStudentPage = lazy(() => import('../pages/college/EditStudent').then((m) => ({ default: m.CollegeEditStudentPage })));
const CollegeStudentDetailPage = lazy(() => import('../pages/college/StudentDetail').then((m) => ({ default: m.CollegeStudentDetailPage })));
const CollegeUploadStudentsPage = lazy(() => import('../pages/college/UploadStudents').then((m) => ({ default: m.CollegeUploadStudentsPage })));
const PublicAiAssistantPage = lazy(() => import('../pages/public/AiAssistant').then((m) => ({ default: m.AiAssistantPage })));
const PortalAiAssistantPage = lazy(() => import('../pages/portal/AiAssistant').then((m) => ({ default: m.PortalAiAssistantPage })));
const AdminKnowledgePage = lazy(() => import('../pages/admin/Knowledge').then((m) => ({ default: m.AdminKnowledgePage })));
const AdminAiUsagePage = lazy(() => import('../pages/admin/AiUsage').then((m) => ({ default: m.AdminAiUsagePage })));
const AdminAnnouncementsPage = lazy(() => import('../pages/admin/Announcements').then((m) => ({ default: m.AdminAnnouncementsPage })));
const AdminSystemJobsPage = lazy(() => import('../pages/admin/SystemJobs').then((m) => ({ default: m.AdminSystemJobsPage })));
const AdminTemplatesPage = lazy(() => import('../pages/admin/Templates').then((m) => ({ default: m.AdminTemplatesPage })));
const NotificationsPage = lazy(() => import('../pages/portal/Notifications').then((m) => ({ default: m.NotificationsPage })));
const CollegeReportsPage = lazy(() => import('../pages/admin/Reports').then((m) => ({ default: m.CollegeReportsPage })));

export function AppRoutes() {
  return (
    <Suspense
      fallback={
        <main id="main-content" className="mx-auto max-w-xl px-4 py-16">
          <Loading label="Loading page…" />
        </main>
      }
    >
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/about-scheme" element={<About />} />
        <Route path="/scheme" element={<Scheme />} />
        <Route path="/implementing-body" element={<ImplementingBody />} />
        <Route path="/nodal-agency" element={<NodalAgency />} />
        <Route path="/nodalAgency" element={<NodalAgency />} />
        <Route path="/insurance" element={<Insurance />} />
        <Route path="/personal-accidents" element={<PersonalAccidents />} />
        <Route path="/mediclaim-coverage" element={<MediclaimCoverage />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/downloads" element={<Downloads />} />
        <Route path="/gr" element={<Downloads />} />
        <Route path="/useful-links" element={<UsefulLinks />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/ai-assistant" element={<PublicAiAssistantPage />} />
        <Route path="/chat" element={<PublicAiAssistantPage />} />
        <Route path="/press" element={<Press />} />
        <Route path="/national-document" element={<NationalDocument />} />
        <Route path="/icici-document" element={<IciciDocument />} />
        <Route path="/website-policy" element={<WebsitePolicies />} />
        <Route path="/website-policies" element={<WebsitePolicies />} />
        <Route path="/privacy-policy" element={<PolicyPageView slug="privacy-policy" />} />
        <Route path="/terms" element={<PolicyPageView slug="terms-and-conditions" />} />
        <Route path="/terms-and-conditions" element={<PolicyPageView slug="terms-and-conditions" />} />
        <Route path="/accessibility-statement" element={<PolicyPageView slug="accessibility-statement" />} />
        <Route path="/copyright-policy" element={<PolicyPageView slug="copyright-policy" />} />
        <Route path="/hyperlink-policy" element={<PolicyPageView slug="hyperlink-policy" />} />
        <Route path="/content-archival-policy" element={<PolicyPageView slug="content-archival-policy" />} />
        <Route path="/website-monitoring-plan" element={<PolicyPageView slug="website-monitoring-plan" />} />
        <Route path="/content-contribution" element={<PolicyPageView slug="content-contribution" />} />
        <Route path="/content-review-policy" element={<PolicyPageView slug="content-review-policy" />} />
        <Route path="/contingency-management-plan" element={<PolicyPageView slug="contingency-management-plan" />} />
        <Route path="/security-policy" element={<PolicyPageView slug="security-policy" />} />
        <Route path="/disclaimer" element={<PolicyPageView slug="disclaimer" />} />
        <Route path="/disclaimer-footer" element={<Navigate to="/disclaimer" replace />} />
        <Route
          path="/login"
          element={
            <GuestOnly>
              <LoginPage />
            </GuestOnly>
          }
        />
        <Route
          path="/signup"
          element={
            <GuestOnly>
              <SignupPage />
            </GuestOnly>
          }
        />
        <Route path="/sign-up" element={<Navigate to="/signup" replace />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      </Route>
      <Route
        element={
          <RoleProtectedRoute roles={['COLLEGE']}>
            <CollegeLayout />
          </RoleProtectedRoute>
        }
      >
        <Route path="/college" element={<CollegeDashboardPage />} />
        <Route path="/college/notifications" element={<NotificationsPage title="Notifications" path="/college/notifications" />} />
        <Route path="/college/reports" element={<CollegeReportsPage />} />
        <Route path="/college/profile" element={<CollegeProfilePage />} />
        <Route path="/college/submissions/new" element={<CollegeNewSubmissionPage />} />
        <Route path="/college/submissions/:id/upload" element={<CollegeSubmissionUploadPage />} />
        <Route path="/college/submissions/:id/preview" element={<CollegeSubmissionPreviewPage />} />
        <Route path="/college/submissions/:id/premium" element={<CollegeSubmissionPremiumPage />} />
        <Route path="/college/submissions/:id/review" element={<CollegeSubmissionReviewPage />} />
        <Route path="/college/submissions/:id" element={<CollegeSubmissionDetailPage />} />
        <Route path="/college/submissions" element={<CollegeSubmissionsPage />} />
        <Route path="/college/students/add" element={<CollegeAddStudentPage />} />
        <Route path="/college/students/upload" element={<CollegeUploadStudentsPage />} />
        <Route path="/college/students/:id/edit" element={<CollegeEditStudentPage />} />
        <Route path="/college/students/:id" element={<CollegeStudentDetailPage />} />
        <Route path="/college/students" element={<CollegeStudentsPage />} />
        <Route path="/college/insurance" element={<CollegeModuleRecordsPage kind="insurance" />} />
        <Route path="/college/documents" element={<CollegeModuleRecordsPage kind="documents" />} />
        <Route path="/college/ecard" element={<CollegeModuleRecordsPage kind="ecards" />} />
        <Route path="/college/payment-status" element={<CollegeModuleRecordsPage kind="payments" />} />
        <Route path="/college/review" element={<CollegeComingSoon title="Review" />} />
        <Route path="/college/ai-assistant" element={<PortalAiAssistantPage title="College AI assistant" path="/college/ai-assistant" />} />
      </Route>
      <Route
        element={
          <RoleProtectedRoute roles={['ADMIN']}>
            <AdminLayout />
          </RoleProtectedRoute>
        }
      >
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/submissions/:id" element={<AdminSubmissionDetailPage />} />
        <Route path="/admin/submissions" element={<AdminSubmissionsPage />} />
        <Route path="/admin/work-queue" element={<AdminWorkQueuePage />} />
        <Route path="/admin/notifications" element={<NotificationsPage title="Notifications" path="/admin/notifications" />} />
        <Route path="/admin/announcements" element={<AdminAnnouncementsPage />} />
        <Route path="/admin/system-jobs" element={<AdminSystemJobsPage />} />
        <Route path="/admin/notification-templates" element={<AdminTemplatesPage />} />
        <Route path="/admin/institutes" element={<AdminInstitutesPage />} />
        <Route path="/admin/institutes/:id" element={<AdminInstituteDetailPage />} />
        <Route path="/admin/universities" element={<AdminUniversitiesPage />} />
        <Route path="/admin/students/:id" element={<AdminStudentDetailPage />} />
        <Route path="/admin/students" element={<AdminStudentsPage />} />
        <Route path="/admin/insurance" element={<AdminModuleRecordsPage kind="insurance" />} />
        <Route path="/admin/documents" element={<AdminModuleRecordsPage kind="documents" />} />
        <Route path="/admin/payments" element={<AdminModuleRecordsPage kind="payments" />} />
        <Route path="/admin/ecards" element={<AdminModuleRecordsPage kind="ecards" />} />
        <Route path="/admin/registrations/:id" element={<AdminInstituteDetailPage />} />
        <Route path="/admin/registrations" element={<AdminRegistrationsPage />} />
        <Route path="/admin/reports" element={<AdminReportsPage />} />
        <Route path="/admin/audit-logs" element={<AdminAuditLogsPage />} />
        <Route path="/admin/login-activity" element={<AdminLoginActivityPage />} />
        <Route path="/admin/system-health" element={<AdminSystemHealthPage />} />
        <Route path="/admin/storage-health" element={<AdminStorageHealthPage />} />
        <Route path="/admin/support" element={<AdminSupportPage />} />
        <Route path="/admin/knowledge" element={<AdminKnowledgePage />} />
        <Route path="/admin/ai-assistant" element={<PortalAiAssistantPage title="Admin AI assistant" path="/admin/ai-assistant" />} />
        <Route path="/admin/ai-usage" element={<AdminAiUsagePage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/profile" element={<AdminProfilePage />} />
        <Route path="/admin/settings" element={<AdminSettingsPage />} />
      </Route>
      <Route element={<PublicLayout />}>
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route path="/error" element={<ServerErrorPage />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/session-expired" element={<SessionExpiredPage />} />
        <Route path="/network-error" element={<NetworkErrorPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
    </Suspense>
  );
}
