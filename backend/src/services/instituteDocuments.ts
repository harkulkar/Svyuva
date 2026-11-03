import { isUploadDocumentType, uploadDocumentLabel } from '../data/uploadDocumentCatalog.js';

export type InstituteDocumentRow = {
  _id: unknown;
  documentType?: string | null;
  originalFilename?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  uploadedAt?: Date | null;
  createdAt?: Date | null;
  versionNumber?: number | null;
  isCurrent?: boolean | null;
  uploadJobId?: unknown;
};

export type InstituteUploadJobInfo = {
  _id: unknown;
  filename?: string | null;
  insurer?: string | null;
  policyType?: string | null;
  paymentStatus?: string | null;
  validCount?: number | null;
};

function documentDate(row: InstituteDocumentRow): Date | null {
  return row.uploadedAt ?? row.createdAt ?? null;
}

/** Groups an institute's documents by the student upload they belong to, newest group first. */
export function groupInstituteDocuments(rows: InstituteDocumentRow[], jobs: InstituteUploadJobInfo[]) {
  const jobById = new Map(jobs.map((job) => [String(job._id), job]));
  const groups = new Map<string, { uploadJobId: string | null; items: ReturnType<typeof toItem>[] }>();

  const toItem = (row: InstituteDocumentRow) => {
    const type = row.documentType || '';
    const when = documentDate(row);
    return {
      id: String(row._id),
      documentType: type,
      label: isUploadDocumentType(type) ? uploadDocumentLabel(type) : type || 'Document',
      filename: row.originalFilename || 'document',
      mimeType: row.mimeType || null,
      sizeBytes: row.sizeBytes ?? null,
      uploadedAt: when ? new Date(when).toISOString() : null,
      version: row.versionNumber ?? 1,
      isCurrent: row.isCurrent !== false
    };
  };

  for (const row of rows) {
    const key = row.uploadJobId ? String(row.uploadJobId) : 'none';
    const group = groups.get(key) ?? { uploadJobId: row.uploadJobId ? String(row.uploadJobId) : null, items: [] };
    group.items.push(toItem(row));
    groups.set(key, group);
  }

  return [...groups.values()]
    .map((group) => {
      const job = group.uploadJobId ? jobById.get(group.uploadJobId) : undefined;
      group.items.sort((a, b) => (a.isCurrent === b.isCurrent ? (b.uploadedAt ?? '').localeCompare(a.uploadedAt ?? '') : a.isCurrent ? -1 : 1));
      const latest = group.items.reduce((max, item) => ((item.uploadedAt ?? '') > max ? item.uploadedAt ?? '' : max), '');
      return {
        uploadJobId: group.uploadJobId,
        uploadedAt: latest || null,
        uploadFilename: job?.filename ?? null,
        insurer: job?.insurer ?? null,
        policyType: job?.policyType ?? null,
        paymentStatus: job?.paymentStatus ?? null,
        studentCount: job?.validCount ?? null,
        items: group.items
      };
    })
    .sort((a, b) => (b.uploadedAt ?? '').localeCompare(a.uploadedAt ?? ''));
}
