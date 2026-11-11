import { readFile } from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import { POLICY_DOCUMENTS } from '../data/insurerPremiumCatalog.js';
import { env } from '../config/env.js';
import { Institute } from '../models/Institute.js';
import { University } from '../models/University.js';
import { InstitutePolicyDocument } from '../models/InstitutePolicyDocument.js';
import { UploadJob } from '../models/UploadJob.js';
import { buildStudentDataWorkbook } from '../services/excelService.js';
import { emailService, type EmailAttachment } from '../services/emailService.js';
import { policyDocumentFilePath } from '../services/policyDocumentStorage.js';
import { logger } from '../utils/logger.js';

export const PAYMENT_NOTICE_CC = [
  'abhishek.harkulkar@buypolicynow.com',
  'bantikumar.lanjewar@icicilombard.com'
];

function safeFilename(name: string) {
  const cleaned = name.replace(/[^\w.\- ()]/g, '_').slice(0, 140);
  return cleaned || 'document';
}

function money(paise: number | null | undefined) {
  if (paise == null || !Number.isFinite(paise)) return '';
  return (paise / 100).toFixed(2);
}

export async function sendCollegePaymentEmails(input: {
  instituteId: string;
  uploadJobId: string;
  paymentId: string;
  amountPaise?: number | null;
  razorpayPaymentId?: string | null;
}) {
  if (env.NODE_ENV === 'test' || mongoose.connection.name === 'SVYSY_TEST') {
    logger.info('payment_mail_skipped', { reason: 'test_database', paymentId: input.paymentId });
    return;
  }

  const [institute, job] = await Promise.all([
    Institute.findById(input.instituteId).select('name email universityId'),
    UploadJob.findById(input.uploadJobId)
  ]);
  if (!job) {
    logger.error('payment_mail_missing_job', { uploadJobId: input.uploadJobId });
    return;
  }

  const quote = (job.premiumQuote || {}) as Record<string, unknown>;
  const insurerName = typeof quote.insurerName === 'string' && quote.insurerName ? quote.insurerName : job.insurer || '';
  const policyLabel = typeof quote.policyLabel === 'string' && quote.policyLabel ? quote.policyLabel : job.policyType || '';
  const rows = Array.isArray(job.validRows) ? (job.validRows as Array<Record<string, unknown>>) : [];
  const attachments: EmailAttachment[] = [
    {
      filename: 'students.xlsx',
      content: buildStudentDataWorkbook(rows),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
  ];
  const missing: string[] = [];
  const used = new Set<string>(['students.xlsx']);
  const seenKeys = new Set<string>();
  const archived = await InstitutePolicyDocument.find({ uploadJobId: job._id }).select(
    'documentKey label originalFilename storedName mimeType'
  );
  const files = [
    ...(job.policyDocuments || []).map((doc) => ({
      key: doc.key,
      label: POLICY_DOCUMENTS.find((item) => item.key === doc.key)?.label || doc.key,
      originalFilename: doc.originalFilename,
      storedName: doc.storedName,
      mimeType: doc.mimeType
    })),
    ...archived.map((doc) => ({
      key: doc.documentKey,
      label: doc.label,
      originalFilename: doc.originalFilename,
      storedName: doc.storedName,
      mimeType: doc.mimeType
    }))
  ];
  for (const doc of files) {
    if (!doc.key || seenKeys.has(doc.key)) continue;
    seenKeys.add(doc.key);
    const label = doc.label || doc.key;
    if (!doc.storedName) {
      missing.push(label);
      continue;
    }
    try {
      const content = await readFile(policyDocumentFilePath(doc.storedName));
      let filename = safeFilename(doc.originalFilename || `${doc.key}${path.extname(doc.storedName)}`);
      if (used.has(filename.toLowerCase())) {
        filename = safeFilename(`${doc.key}-${filename}`);
      }
      used.add(filename.toLowerCase());
      attachments.push({ filename, content, contentType: doc.mimeType || undefined });
    } catch {
      missing.push(label);
    }
  }

  const instituteName = institute?.name || 'College';
  const university = institute?.universityId ? await University.findById(institute.universityId).select('name') : null;
  const amount = money(input.amountPaise);
  const summary = [
    `College: ${instituteName}`,
    university?.name ? `University: ${university.name}` : '',
    institute?.email ? `College email: ${institute.email}` : '',
    `Insurer: ${insurerName || '—'}`,
    `Policy: ${policyLabel || '—'}`,
    `Students: ${rows.length}`,
    amount ? `Amount paid: INR ${amount}` : '',
    input.razorpayPaymentId ? `Payment reference: ${input.razorpayPaymentId}` : ''
  ].filter(Boolean);

  const collegeEmail = institute?.email?.trim() || '';
  const result = await emailService.sendEmail({
    to: collegeEmail || PAYMENT_NOTICE_CC[0] || 'info@svyuvasuraksha.org',
    cc: collegeEmail ? PAYMENT_NOTICE_CC : PAYMENT_NOTICE_CC.slice(1),
    subject: `Payment confirmation — ${instituteName}`,
    text: [
      `Premium payment for ${instituteName} was received.`,
      '',
      ...summary,
      '',
      'The student data sheet and the documents uploaded by the college are attached.',
      ...(missing.length ? [`These documents could not be attached because the file was missing: ${missing.join(', ')}.`] : []),
      '',
      'This message is sent to the college for confirmation, with a copy to the nodal office and the insurer.'
    ].join('\n'),
    attachments,
    required: true,
    template: 'college_payment_confirmation',
    notificationType: 'PAYMENT_VERIFIED',
    relatedEntityType: 'Payment',
    relatedEntityId: input.paymentId
  });

  logger.info('payment_mail_result', {
    paymentId: input.paymentId,
    status: result.status,
    to: collegeEmail || PAYMENT_NOTICE_CC[0]
  });
}
