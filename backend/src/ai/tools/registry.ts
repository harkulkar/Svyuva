import type { Request } from 'express';
import { AppError } from '../../middleware/errorHandler.js';
import { Document } from '../../models/Document.js';
import { Institute } from '../../models/Institute.js';
import { InsuranceEnrollment } from '../../models/InsuranceEnrollment.js';
import { Payment } from '../../models/Payment.js';
import { Student } from '../../models/Student.js';
import { University } from '../../models/University.js';
import { UploadJob } from '../../models/UploadJob.js';
import type { AuthUser } from '../../types/auth.js';
import type { ToolCallResult, ToolName } from '../ai.types.js';
import { writeAudit } from '../../services/auditService.js';

function collegeId(user: AuthUser | undefined): string {
  if (!user?.instituteId) throw new AppError('College scope is required.', 403, 'FORBIDDEN');
  return user.instituteId;
}

export async function runAuthorizedTool(name: ToolName, user: AuthUser | undefined, req?: Request): Promise<ToolCallResult> {
  try {
    let data: unknown;
    if (name === 'getDashboardStatistics') {
      if (user?.role !== 'ADMIN') throw new AppError('Not allowed.', 403, 'FORBIDDEN');
      const [universities, institutes, pending, students, insurance] = await Promise.all([
        University.countDocuments(),
        Institute.countDocuments(),
        Institute.countDocuments({ status: 'PENDING' }),
        Student.countDocuments(),
        InsuranceEnrollment.countDocuments()
      ]);
      const failedUploads = await UploadJob.countDocuments({ invalidCount: { $gt: 0 } });
      data = {
        universities,
        institutes,
        pendingInstitutes: pending,
        students,
        insuranceRecords: insurance,
        insuranceHttpApi: 'not_implemented',
        failedUploads
      };
    } else if (name === 'getMyInstituteSummary') {
      if (user?.role !== 'COLLEGE') throw new AppError('Not allowed.', 403, 'FORBIDDEN');
      const id = collegeId(user);
      const [students, insurance, documents] = await Promise.all([
        Student.countDocuments({ instituteId: id }),
        InsuranceEnrollment.countDocuments({ instituteId: id }),
        Document.countDocuments({ instituteId: id })
      ]);
      data = { instituteIdFromSession: true, students, insuranceRecords: insurance, documentMetadata: documents };
    } else if (name === 'searchMyStudents') {
      if (user?.role !== 'COLLEGE') throw new AppError('Not allowed.', 403, 'FORBIDDEN');
      const id = collegeId(user);
      const count = await Student.countDocuments({ instituteId: id });
      data = { instituteIdFromSession: true, studentCount: count };
    } else if (name === 'countInsuranceRecords') {
      if (user?.role === 'ADMIN') {
        data = { records: await InsuranceEnrollment.countDocuments(), httpApi: 'not_implemented' };
      } else if (user?.role === 'COLLEGE') {
        data = {
          records: await InsuranceEnrollment.countDocuments({ instituteId: collegeId(user) }),
          httpApi: 'not_implemented',
          instituteIdFromSession: true
        };
      } else {
        throw new AppError('Not allowed.', 403, 'FORBIDDEN');
      }
    } else if (name === 'countDocumentMetadata') {
      if (user?.role === 'ADMIN') {
        data = { records: await Document.countDocuments(), httpApi: 'not_implemented' };
      } else if (user?.role === 'COLLEGE') {
        data = { records: await Document.countDocuments({ instituteId: collegeId(user) }), httpApi: 'not_implemented' };
      } else {
        throw new AppError('Not allowed.', 403, 'FORBIDDEN');
      }
    } else if (name === 'countPaymentRecords') {
      if (user?.role === 'ADMIN') {
        data = { records: await Payment.countDocuments(), httpApi: 'not_implemented' };
      } else if (user?.role === 'COLLEGE') {
        data = { records: await Payment.countDocuments({ instituteId: collegeId(user) }), httpApi: 'not_implemented' };
      } else {
        throw new AppError('Not allowed.', 403, 'FORBIDDEN');
      }
    } else if (name === 'getAnalyticsAttention') {
      const { getAttentionStats, attentionSentences } = await import('../../analytics/analytics.service.js');
      if (user?.role === 'ADMIN') {
        const stats = await getAttentionStats();
        data = { ...stats, attention: attentionSentences(stats) };
      } else if (user?.role === 'COLLEGE') {
        const stats = await getAttentionStats({ instituteId: collegeId(user) });
        data = { ...stats, attention: attentionSentences(stats), instituteIdFromSession: true };
      } else {
        throw new AppError('Not allowed.', 403, 'FORBIDDEN');
      }
    } else if (name === 'getWorkflowQueueSummary') {
      if (user?.role !== 'ADMIN') throw new AppError('Not allowed.', 403, 'FORBIDDEN');
      const { workQueueSummary } = await import('../../workflow/workQueue.js');
      data = await workQueueSummary(user);
    } else if (name === 'getMyActionCenter') {
      if (user?.role !== 'COLLEGE') throw new AppError('Not allowed.', 403, 'FORBIDDEN');
      const { getCollegeActionCenter } = await import('../../workflow/actionCenter.js');
      data = await getCollegeActionCenter(user);
    } else {
      throw new AppError('Unknown tool.', 400, 'BAD_REQUEST');
    }
    await writeAudit({
      userId: user?.id,
      action: 'AI_TOOL_CALLED',
      entity: 'AiTool',
      entityId: name,
      req,
      metadata: { tool: name, ok: true }
    });
    return { name, ok: true, data };
  } catch (error) {
    const message = error instanceof AppError ? error.message : 'Tool failed';
    return { name, ok: false, error: message };
  }
}

export function selectTools(question: string, role: string): ToolName[] {
  const q = question.toLowerCase();
  const tools: ToolName[] = [];
  if (role === 'ADMIN' && /(how many|pending|registered|failed upload|statistics|dashboard|requires attention|this month|workload|work queue|pending items today)/i.test(q)) {
    tools.push('getDashboardStatistics');
  }
  if (role === 'ADMIN' && /(workload|work queue|pending items today|main pending)/i.test(q)) {
    tools.push('getWorkflowQueueSummary');
  }
  if (/(requires attention|summarise pending|summarize pending|unusual)/i.test(q) && role !== 'GUEST') {
    tools.push('getAnalyticsAttention');
  }
  if (role === 'COLLEGE' && /(my institute|my students|how many students|registered in my)/i.test(q)) {
    tools.push('getMyInstituteSummary');
  }
  if (role === 'COLLEGE' && /(what do i need|pending action|outstanding document|action center|require your attention)/i.test(q)) {
    tools.push('getMyActionCenter');
  }
  if (/(insurance)/i.test(q) && role !== 'GUEST') tools.push('countInsuranceRecords');
  if (/(document upload|failed document)/i.test(q) && role !== 'GUEST') tools.push('countDocumentMetadata');
  if (/(payment)/i.test(q) && role !== 'GUEST') tools.push('countPaymentRecords');
  return [...new Set(tools)];
}

export function isWriteRequest(question: string): boolean {
  return /\b(approve|reject|delete|remove|disable|activate this|pay now|change the payment)\b/i.test(question);
}

export function isCredentialProbe(question: string): boolean {
  return /(password|api key|secret|jwt|token|credentials)/i.test(question);
}

export function isCrossInstituteProbe(question: string): boolean {
  return /(another college|other institute|college b|all colleges'? students|every institute)/i.test(question);
}

export function looksLikeInjection(question: string): boolean {
  return /(ignore .{0,40}instructions|reveal .{0,20}system prompt|you are now)/i.test(question);
}
