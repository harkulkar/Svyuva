import { Router } from 'express';
import { collegeDashboard, collegeProfile, patchCollegeProfile } from '../controllers/collegeController.js';
import {
  collegeDashboardInsights,
  collegeDashboardSummary,
  collegeReportExport,
  collegeReportPreview,
  timelineHandler
} from '../analytics/analytics.controller.js';
import { analyticsQuerySchema, reportQuerySchema } from '../notifications/notification.validators.js';
import { exportLimiter, uploadLimiter } from '../middleware/rateLimit.js';
import {
  collegeStudentDetail,
  collegeStudentImportErrors,
  collegeStudentMeta,
  collegeStudentTemplate,
  collegeStudents,
  importCollegeStudents,
  patchCollegeStudent,
  patchCollegeStudentStatus,
  postCollegeStudent,
  uploadCollegeStudents
} from '../controllers/studentController.js';
import { authenticate } from '../middleware/authenticate.js';
import { excelTimeout, studentExcelUpload } from '../middleware/excelUpload.js';
import { requireRole } from '../middleware/requireRole.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { ok } from '../utils/apiResponse.js';
import { collegeProfileUpdateSchema } from '../validators/authValidators.js';
import {
  importJobSchema,
  studentCreateSchema,
  studentListQuerySchema,
  studentStatusSchema,
  studentUpdateSchema
} from '../validators/studentValidators.js';
import {
  collegeDocuments,
  collegeEcards,
  collegeInsurance,
  collegePayments,
  documentUploadDisabled,
  ecardFileDisabled
} from '../controllers/schemeRecords.controller.js';
import {
  checklistHandler,
  collegeActionCenter,
  documentAccessHandler,
  documentReplaceHandler,
  documentVersionsHandler,
  getEntityWorkflow,
  getWorkflowHandler,
  getWorkflowHistoryHandler,
  postWorkflowAction
} from '../workflow/controller.js';
import { workflowActionSchema } from '../workflow/validators.js';
import {
  calculateCollegeSubmissionPremium,
  collegeSubmissionDetail,
  collegeSubmissionErrors,
  collegeSubmissionMeta,
  collegeSubmissionPreview,
  collegeSubmissions,
  collegeSubmissionStudents,
  collegeSubmissionSummary,
  confirmCollegeSubmission,
  postCollegeSubmission,
  submitCollegeSubmissionHandler,
  uploadCollegeSubmissionExcel
} from '../controllers/submissionController.js';
import {
  createSubmissionSchema,
  submissionListQuerySchema,
  submissionPreviewQuerySchema,
  submissionStudentQuerySchema,
  submitSubmissionSchema
} from '../validators/submissionValidators.js';

export const collegeRouter = Router();
collegeRouter.use(authenticate, requireRole('COLLEGE'));
collegeRouter.get('/ping', (req, res) => {
  res.json(ok({ user: req.authUser }, 'College session valid'));
});
collegeRouter.get('/profile', collegeProfile);
collegeRouter.patch('/profile', validateBody(collegeProfileUpdateSchema), patchCollegeProfile);
collegeRouter.get('/dashboard', collegeDashboard);
collegeRouter.get('/dashboard/summary', validateQuery(analyticsQuerySchema), collegeDashboardSummary);
collegeRouter.get('/dashboard/insights', collegeDashboardInsights);
collegeRouter.get('/submissions/meta', collegeSubmissionMeta);
collegeRouter.get('/submissions/summary', collegeSubmissionSummary);
collegeRouter.get('/submissions', validateQuery(submissionListQuerySchema), collegeSubmissions);
collegeRouter.post('/submissions', validateBody(createSubmissionSchema), postCollegeSubmission);
collegeRouter.get('/submissions/:id/preview', validateQuery(submissionPreviewQuerySchema), collegeSubmissionPreview);
collegeRouter.get('/submissions/:id/students', validateQuery(submissionStudentQuerySchema), collegeSubmissionStudents);
collegeRouter.get('/submissions/:id/errors', collegeSubmissionErrors);
collegeRouter.post('/submissions/:id/upload', uploadLimiter, excelTimeout, studentExcelUpload, uploadCollegeSubmissionExcel);
collegeRouter.post('/submissions/:id/confirm', confirmCollegeSubmission);
collegeRouter.post('/submissions/:id/calculate-premium', calculateCollegeSubmissionPremium);
collegeRouter.post('/submissions/:id/submit', validateBody(submitSubmissionSchema), submitCollegeSubmissionHandler);
collegeRouter.get('/submissions/:id', collegeSubmissionDetail);
collegeRouter.get('/action-center', collegeActionCenter);
collegeRouter.get('/reports/preview', validateQuery(reportQuerySchema), collegeReportPreview);
collegeRouter.get('/reports/export', exportLimiter, validateQuery(reportQuerySchema), collegeReportExport);
collegeRouter.get('/students/meta', collegeStudentMeta);
collegeRouter.get('/students/template', collegeStudentTemplate);
collegeRouter.post('/students/upload', uploadLimiter, excelTimeout, studentExcelUpload, uploadCollegeStudents);
collegeRouter.post('/students/import', uploadLimiter, validateBody(importJobSchema), importCollegeStudents);
collegeRouter.get('/students/import/:jobId/errors', collegeStudentImportErrors);
collegeRouter.get('/students', validateQuery(studentListQuerySchema), collegeStudents);
collegeRouter.post('/students', validateBody(studentCreateSchema), postCollegeStudent);
collegeRouter.get('/students/:id/timeline', timelineHandler);
collegeRouter.get('/students/:id', collegeStudentDetail);
collegeRouter.patch('/students/:id', validateBody(studentUpdateSchema), patchCollegeStudent);
collegeRouter.patch('/students/:id/status', validateBody(studentStatusSchema), patchCollegeStudentStatus);
collegeRouter.get('/insurance', collegeInsurance);
collegeRouter.get('/documents', collegeDocuments);
collegeRouter.post('/documents', uploadLimiter, documentUploadDisabled);
collegeRouter.get('/document-checklist', checklistHandler);
collegeRouter.get('/documents/:id/versions', documentVersionsHandler);
collegeRouter.get('/documents/:id/access', documentAccessHandler);
collegeRouter.post('/documents/:id/replace', documentReplaceHandler);
collegeRouter.get('/workflows/entity/:workflowType/:entityId', getEntityWorkflow);
collegeRouter.get('/workflows/:id/history', getWorkflowHistoryHandler);
collegeRouter.post('/workflows/:id/actions', validateBody(workflowActionSchema), postWorkflowAction);
collegeRouter.get('/workflows/:id', getWorkflowHandler);
collegeRouter.get('/payments', collegePayments);
collegeRouter.get('/ecards', collegeEcards);
collegeRouter.get('/ecards/:id/file', ecardFileDisabled);
