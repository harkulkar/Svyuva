import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import * as XLSX from 'xlsx';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuditLog } from '../models/AuditLog.js';
import { Document } from '../models/Document.js';
import { ECard } from '../models/ECard.js';
import { Institute } from '../models/Institute.js';
import { InsuranceEnrollment } from '../models/InsuranceEnrollment.js';
import { Payment } from '../models/Payment.js';
import { Student } from '../models/Student.js';
import { writeAudit } from '../services/auditService.js';
import { neutralizeSpreadsheetFormula } from '../utils/spreadsheet.js';
import { createdAtFilter, resolveUtcRange } from '../analytics/dateRange.js';
import type { AuthUser } from '../types/auth.js';

export const REPORT_CATEGORIES = [
  'institutes',
  'students',
  'insurance',
  'payments',
  'documents',
  'ecards',
  'registrations',
  'activity'
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export type ReportQuery = {
  category: ReportCategory;
  format?: 'csv' | 'xlsx';
  range?: string;
  from?: string;
  to?: string;
  universityId?: string;
  instituteId?: string;
  status?: string;
  district?: string;
};

function oid(id?: string) {
  if (!id) return undefined;
  if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid identifier.', 400, 'VALIDATION_ERROR');
  return new mongoose.Types.ObjectId(id);
}

function safeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'report';
}

function csvEscape(value: unknown): string {
  const text = neutralizeSpreadsheetFormula(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function scopedFilter(query: ReportQuery, user: AuthUser): Record<string, unknown> {
  const range = resolveUtcRange(query.range, query.from, query.to);
  const filter: Record<string, unknown> = { ...createdAtFilter(range) };
  if (user.role === 'COLLEGE') {
    if (!user.instituteId) throw new AppError('College scope is required.', 403, 'FORBIDDEN');
    filter.instituteId = new mongoose.Types.ObjectId(user.instituteId);
  } else {
    const universityId = oid(query.universityId);
    const instituteId = oid(query.instituteId);
    if (universityId) filter.universityId = universityId;
    if (instituteId) filter.instituteId = instituteId;
  }
  if (query.status) filter.status = query.status.slice(0, 40);
  if (query.district && user.role === 'ADMIN') filter.district = query.district.slice(0, 80);
  return filter;
}

type RowFn = (doc: Record<string, unknown>) => unknown[];

async function collectRows(
  model: { find: (filter: object) => any },
  filter: Record<string, unknown>,
  select: string,
  map: RowFn
) {
  const rows: unknown[][] = [];
  const cursor = model.find(filter).select(select).sort({ createdAt: -1 }).limit(env.MAX_EXPORT_ROWS).lean().cursor({ batchSize: 200 });
  for await (const doc of cursor) {
    rows.push(map(doc as Record<string, unknown>));
  }
  return rows;
}

export async function buildReport(user: AuthUser, query: ReportQuery) {
  const category = query.category;
  if (user.role === 'COLLEGE' && (category === 'institutes' || category === 'registrations')) {
    throw new AppError('Not allowed.', 403, 'FORBIDDEN');
  }
  const filter = scopedFilter(query, user);
  let headers: string[] = [];
  let rows: unknown[][] = [];
  let filename = category;

  if (category === 'institutes' || category === 'registrations') {
    const instFilter = { ...filter };
    if (category === 'registrations') instFilter.status = 'PENDING';
    delete instFilter.instituteId;
    headers = ['Name', 'District', 'Email', 'Status', 'College type', 'Created'];
    rows = await collectRows(Institute, instFilter, 'name district email status collegeType createdAt', (doc) => [
      doc.name,
      doc.district,
      doc.email,
      doc.status,
      doc.collegeType,
      doc.createdAt
    ]);
    filename = category === 'registrations' ? 'registrations' : 'institutes';
  } else if (category === 'students') {
    headers = ['Student ID', 'Enrollment', 'First name', 'Last name', 'Status', 'Academic year', 'Created'];
    rows = await collectRows(
      Student,
      filter,
      'studentId enrollmentNumber firstName lastName status academicYear createdAt',
      (doc) => [doc.studentId, doc.enrollmentNumber, doc.firstName, doc.lastName, doc.status, doc.academicYear, doc.createdAt]
    );
  } else if (category === 'insurance') {
    headers = ['Status', 'Academic year', 'Institute', 'Created'];
    rows = await collectRows(InsuranceEnrollment, filter, 'status academicYear instituteId createdAt', (doc) => [
      doc.status,
      doc.academicYear,
      String(doc.instituteId || ''),
      doc.createdAt
    ]);
  } else if (category === 'payments') {
    const payFilter = { ...filter };
    headers = ['Status', 'Amount', 'Currency', 'Created'];
    rows = await collectRows(Payment, payFilter, 'status amount currency createdAt', (doc) => [
      doc.status,
      doc.amount,
      doc.currency,
      doc.createdAt
    ]);
  } else if (category === 'documents') {
    const docFilter = { ...filter };
    if (query.status) {
      delete docFilter.status;
      docFilter.fileStatus = query.status.slice(0, 40);
    }
    headers = ['File status', 'Document type', 'Created'];
    rows = await collectRows(Document, docFilter, 'fileStatus documentType createdAt', (doc) => [
      doc.fileStatus,
      doc.documentType,
      doc.createdAt
    ]);
  } else if (category === 'ecards') {
    headers = ['Status', 'Issued at', 'Created'];
    rows = await collectRows(ECard, filter, 'status issuedAt createdAt', (doc) => [doc.status, doc.issuedAt, doc.createdAt]);
  } else {
    const activityFilter: Record<string, unknown> = { ...createdAtFilter(resolveUtcRange(query.range, query.from, query.to)) };
    if (user.role === 'COLLEGE') {
      activityFilter['metadata.instituteId'] = user.instituteId;
    }
    headers = ['Action', 'Entity', 'Entity ID', 'Created'];
    rows = await collectRows(AuditLog, activityFilter, 'action entity entityId createdAt', (doc) => [
      doc.action,
      doc.entity,
      doc.entityId,
      doc.createdAt
    ]);
    filename = 'activity';
  }

  return { headers, rows, filename: safeFilename(filename), truncated: rows.length >= env.MAX_EXPORT_ROWS };
}

export async function exportReport(user: AuthUser, query: ReportQuery, req?: Request) {
  const format = query.format === 'xlsx' ? 'xlsx' : 'csv';
  const report = await buildReport(user, query);
  await writeAudit({
    userId: user.id,
    action: 'REPORT_EXPORTED',
    entity: 'Report',
    entityId: query.category,
    req,
    metadata: {
      category: query.category,
      format,
      rowCount: report.rows.length,
      truncated: report.truncated,
      range: query.range || null
    }
  });
  if (format === 'csv') {
    const body = [report.headers, ...report.rows].map((line) => line.map(csvEscape).join(',')).join('\n');
    return {
      filename: `${report.filename}.csv`,
      contentType: 'text/csv; charset=utf-8',
      buffer: Buffer.from(body, 'utf8')
    };
  }
  const sheet = XLSX.utils.aoa_to_sheet([
    report.headers,
    ...report.rows.map((line) => line.map((cell) => neutralizeSpreadsheetFormula(cell)))
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Report');
  return {
    filename: `${report.filename}.xlsx`,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  };
}

export function sendReportFile(res: Response, file: { filename: string; contentType: string; buffer: Buffer }) {
  res.setHeader('Content-Type', file.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.send(file.buffer);
}

export async function previewReport(user: AuthUser, query: ReportQuery) {
  const report = await buildReport(user, { ...query, format: 'csv' });
  return {
    category: query.category,
    headers: report.headers,
    preview: report.rows.slice(0, 25),
    rowCount: report.rows.length,
    truncated: report.truncated,
    maxRows: env.MAX_EXPORT_ROWS,
    pdfSupported: false
  };
}
