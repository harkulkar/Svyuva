import { Router } from 'express';
import {
  adminAuditLogs,
  adminDashboard,
  adminGlobalSearch,
  adminInstituteDetail,
  adminInstitutes,
  adminProfile,
  adminReports,
  adminUniversities,
  adminUniversityDetail,
  adminUniversityOptions,
  adminUsers,
  approveInstituteHandler,
  exportInstitutesHandler,
  exportStudentsHandler,
  patchAdminProfile,
  patchAdminUserStatus,
  patchInstituteStatus,
  patchUniversity,
  patchUniversityStatus,
  pendingInstitutes,
  postUniversity,
  rejectInstituteHandler
} from '../controllers/adminController.js';
import { adminStudentDetail, adminStudents, patchAdminStudentStatus } from '../controllers/adminStudentController.js';
import {
  adminDataCorrection,
  adminFeatureFlags,
  adminInactiveAccounts,
  adminLoginActivity,
  adminStorageHealth,
  adminSupportSearch,
  adminSystemHealth
} from '../controllers/operationsController.js';
import {
  collegeDocuments,
  collegeEcards,
  collegeInsurance,
  collegePayments
} from '../controllers/schemeRecords.controller.js';
import {
  adminDashboardActivity,
  adminDashboardAnalytics,
  adminDashboardInsights,
  adminDashboardSummary,
  adminJobRetry,
  adminJobsList,
  adminReportExport,
  adminReportPreview,
  adminSettingsList,
  adminSettingsPatch,
  announcementCreate,
  announcementDetail,
  announcementPatch,
  announcementPublish,
  announcementUnpublish,
  announcementsList,
  templatesList,
  templatesUpsert,
  timelineHandler
} from '../analytics/analytics.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { exportLimiter, searchLimiter } from '../middleware/rateLimit.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { ok } from '../utils/apiResponse.js';
import { adminInstituteQuerySchema, createUniversitySchema, rejectInstituteSchema } from '../validators/authValidators.js';
import { adminStudentListQuerySchema } from '../validators/studentValidators.js';
import {
  adminAuditQuerySchema,
  adminProfileUpdateSchema,
  adminSearchQuerySchema,
  adminStudentStatusSchema,
  adminUniversityQuerySchema,
  adminUserQuerySchema,
  exportQuerySchema,
  statusToggleSchema,
  updateUniversitySchema
} from '../validators/adminValidators.js';
import {
  analyticsQuerySchema,
  announcementCreateSchema,
  announcementUpdateSchema,
  reportQuerySchema,
  settingsPatchSchema,
  templateUpsertSchema
} from '../notifications/notification.validators.js';
import {
  adminSupportQuerySchema,
  dataCorrectionSchema,
  inactiveAccountsQuerySchema,
  loginActivityQuerySchema
} from '../validators/operationsValidators.js';
import {
  adminAssignWorkflow,
  adminBulkAssign,
  adminWorkQueue,
  adminWorkQueueSummary,
  checklistHandler,
  documentAccessHandler,
  documentReviewHandler,
  documentVersionsHandler,
  getEntityWorkflow,
  getWorkflowHandler,
  getWorkflowHistoryHandler,
  postWorkflowAction,
  requirementsListHandler,
  requirementsUpsertHandler,
  reviewChecklistHandler,
  reviewChecklistUpsertHandler,
  reviewDecisionHandler,
  reviewDetailHandler
} from '../workflow/controller.js';
import {
  assignWorkflowSchema,
  bulkAssignSchema,
  documentRequirementSchema,
  documentReviewSchema,
  reviewChecklistItemSchema,
  reviewDecisionSchema,
  workQueueQuerySchema,
  workflowActionSchema
} from '../workflow/validators.js';
import {
  adminPremiumRules,
  adminRecalculatePremium,
  adminSubmissionDetail,
  adminSubmissionErrors,
  adminSubmissionExport,
  adminSubmissionPreview,
  adminSubmissionReview,
  adminSubmissions,
  adminSubmissionStudents,
  adminSubmissionSummary,
  putAdminPremiumRule
} from '../controllers/submissionController.js';
import {
  adminReviewSchema,
  premiumRuleUpsertSchema,
  submissionExportQuerySchema,
  submissionListQuerySchema,
  submissionPreviewQuerySchema,
  submissionStudentQuerySchema
} from '../validators/submissionValidators.js';

export const adminRouter = Router();
adminRouter.use(authenticate, requireRole('ADMIN'));
adminRouter.get('/ping', (req, res) => {
  res.json(ok({ user: req.authUser }, 'Admin session valid'));
});
adminRouter.get('/dashboard', adminDashboard);
adminRouter.get('/dashboard/summary', adminDashboardSummary);
adminRouter.get('/dashboard/analytics', validateQuery(analyticsQuerySchema), adminDashboardAnalytics);
adminRouter.get('/dashboard/activity', adminDashboardActivity);
adminRouter.get('/dashboard/insights', adminDashboardInsights);
adminRouter.get('/submissions/summary', adminSubmissionSummary);
adminRouter.get('/submissions/export', exportLimiter, validateQuery(submissionExportQuerySchema), adminSubmissionExport);
adminRouter.get('/submissions', validateQuery(submissionListQuerySchema), adminSubmissions);
adminRouter.get('/submissions/:id/students', validateQuery(submissionStudentQuerySchema), adminSubmissionStudents);
adminRouter.get('/submissions/:id/preview', validateQuery(submissionPreviewQuerySchema), adminSubmissionPreview);
adminRouter.get('/submissions/:id/errors', adminSubmissionErrors);
adminRouter.post('/submissions/:id/review', validateBody(adminReviewSchema), adminSubmissionReview);
adminRouter.post('/submissions/:id/recalculate-premium', adminRecalculatePremium);
adminRouter.get('/submissions/:id', adminSubmissionDetail);
adminRouter.get('/premium-rules', adminPremiumRules);
adminRouter.put('/premium-rules', validateBody(premiumRuleUpsertSchema), putAdminPremiumRule);
adminRouter.get('/system-health', adminSystemHealth);
adminRouter.get('/storage-health', adminStorageHealth);
adminRouter.get('/feature-flags', adminFeatureFlags);
adminRouter.get('/support', searchLimiter, validateQuery(adminSupportQuerySchema), adminSupportSearch);
adminRouter.get('/login-activity', validateQuery(loginActivityQuerySchema), adminLoginActivity);
adminRouter.get('/accounts/inactive', validateQuery(inactiveAccountsQuerySchema), adminInactiveAccounts);
adminRouter.post('/corrections', validateBody(dataCorrectionSchema), adminDataCorrection);
adminRouter.get('/search', searchLimiter, validateQuery(adminSearchQuerySchema), adminGlobalSearch);
adminRouter.get('/reports/preview', validateQuery(reportQuerySchema), adminReportPreview);
adminRouter.get('/reports/export', exportLimiter, validateQuery(reportQuerySchema), adminReportExport);
adminRouter.get('/reports', adminReports);
adminRouter.get('/announcements', announcementsList);
adminRouter.post('/announcements', validateBody(announcementCreateSchema), announcementCreate);
adminRouter.get('/announcements/:id', announcementDetail);
adminRouter.patch('/announcements/:id', validateBody(announcementUpdateSchema), announcementPatch);
adminRouter.post('/announcements/:id/publish', announcementPublish);
adminRouter.post('/announcements/:id/unpublish', announcementUnpublish);
adminRouter.get('/notification-templates', templatesList);
adminRouter.put('/notification-templates', validateBody(templateUpsertSchema), templatesUpsert);
adminRouter.get('/system-jobs', adminJobsList);
adminRouter.post('/system-jobs/:name/retry', adminJobRetry);
adminRouter.get('/operational-settings', adminSettingsList);
adminRouter.patch('/operational-settings', validateBody(settingsPatchSchema), adminSettingsPatch);
adminRouter.get('/audit-logs', validateQuery(adminAuditQuerySchema), adminAuditLogs);
adminRouter.get('/profile', adminProfile);
adminRouter.patch('/profile', validateBody(adminProfileUpdateSchema), patchAdminProfile);
adminRouter.get('/users', validateQuery(adminUserQuerySchema), adminUsers);
adminRouter.patch('/users/:id/status', validateBody(statusToggleSchema), patchAdminUserStatus);
adminRouter.get('/universities/options', adminUniversityOptions);
adminRouter.get('/universities', validateQuery(adminUniversityQuerySchema), adminUniversities);
adminRouter.post('/universities', validateBody(createUniversitySchema), postUniversity);
adminRouter.get('/universities/:id', adminUniversityDetail);
adminRouter.patch('/universities/:id', validateBody(updateUniversitySchema), patchUniversity);
adminRouter.patch('/universities/:id/status', validateBody(statusToggleSchema), patchUniversityStatus);
adminRouter.get('/work-queue/summary', adminWorkQueueSummary);
adminRouter.get('/work-queue', validateQuery(workQueueQuerySchema), adminWorkQueue);
adminRouter.post('/work-queue/assign-bulk', validateBody(bulkAssignSchema), adminBulkAssign);
adminRouter.post('/work-queue/:id/assign', validateBody(assignWorkflowSchema), adminAssignWorkflow);
adminRouter.get('/workflows/entity/:workflowType/:entityId', getEntityWorkflow);
adminRouter.get('/workflows/:id/history', getWorkflowHistoryHandler);
adminRouter.post('/workflows/:id/actions', validateBody(workflowActionSchema), postWorkflowAction);
adminRouter.get('/workflows/:id', getWorkflowHandler);
adminRouter.get('/document-requirements', requirementsListHandler);
adminRouter.put('/document-requirements', validateBody(documentRequirementSchema), requirementsUpsertHandler);
adminRouter.get('/review-checklist', reviewChecklistHandler);
adminRouter.put('/review-checklist', validateBody(reviewChecklistItemSchema), reviewChecklistUpsertHandler);
adminRouter.get('/reviews/:id', reviewDetailHandler);
adminRouter.post('/reviews/:id/decision', validateBody(reviewDecisionSchema), reviewDecisionHandler);
adminRouter.get('/documents/:id/versions', documentVersionsHandler);
adminRouter.get('/documents/:id/access', documentAccessHandler);
adminRouter.post('/documents/:id/review', validateBody(documentReviewSchema), documentReviewHandler);
adminRouter.get('/document-checklist', checklistHandler);
adminRouter.get('/institutes/export', exportLimiter, validateQuery(exportQuerySchema), exportInstitutesHandler);
adminRouter.get('/institutes/pending', validateQuery(adminInstituteQuerySchema), pendingInstitutes);
adminRouter.get('/registrations', validateQuery(adminInstituteQuerySchema), pendingInstitutes);
adminRouter.get('/institutes', validateQuery(adminInstituteQuerySchema), adminInstitutes);
adminRouter.get('/institutes/:id/timeline', timelineHandler);
adminRouter.get('/institutes/:id', adminInstituteDetail);
adminRouter.patch('/institutes/:id/approve', approveInstituteHandler);
adminRouter.patch('/institutes/:id/reject', validateBody(rejectInstituteSchema), rejectInstituteHandler);
adminRouter.patch('/institutes/:id/status', validateBody(statusToggleSchema), patchInstituteStatus);
adminRouter.get('/students/export', exportLimiter, validateQuery(exportQuerySchema), exportStudentsHandler);
adminRouter.get('/students', validateQuery(adminStudentListQuerySchema), adminStudents);
adminRouter.get('/students/:id/timeline', timelineHandler);
adminRouter.get('/students/:id', adminStudentDetail);
adminRouter.patch('/students/:id/status', validateBody(adminStudentStatusSchema), patchAdminStudentStatus);
adminRouter.get('/insurance', collegeInsurance);
adminRouter.get('/documents', collegeDocuments);
adminRouter.get('/payments', collegePayments);
adminRouter.get('/ecards', collegeEcards);
