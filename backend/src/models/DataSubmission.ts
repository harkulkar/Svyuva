import mongoose, { Schema, type InferSchemaType } from 'mongoose';

export const DATA_SUBMISSION_STATUSES = [
  'DRAFT',
  'VALIDATING',
  'VALIDATED',
  'PREMIUM_CALCULATED',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'CORRECTION_REQUIRED'
] as const;

export type DataSubmissionStatus = (typeof DATA_SUBMISSION_STATUSES)[number];

export const SUBMISSION_EDITABLE_STATUSES: DataSubmissionStatus[] = [
  'DRAFT',
  'VALIDATING',
  'VALIDATED',
  'PREMIUM_CALCULATED',
  'CORRECTION_REQUIRED'
];

export const SUBMISSION_LOCKED_STATUSES: DataSubmissionStatus[] = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED'
];

export const SUBMISSION_OPEN_STATUSES: DataSubmissionStatus[] = [
  'DRAFT',
  'VALIDATING',
  'VALIDATED',
  'PREMIUM_CALCULATED',
  'SUBMITTED',
  'UNDER_REVIEW',
  'CORRECTION_REQUIRED',
  'APPROVED'
];

const fileMeta = {
  originalFilename: { type: String, trim: true, default: '' },
  mimeType: { type: String, trim: true, default: '' },
  sizeBytes: { type: Number, default: null },
  sha256: { type: String, trim: true, default: '' },
  storageKey: { type: String, trim: true, default: '' }
};

export const dataSubmissionSchema = new Schema(
  {
    submissionNumber: { type: String, required: true, trim: true },
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', required: true },
    universityId: { type: Schema.Types.ObjectId, ref: 'University', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    academicYear: { type: String, required: true, trim: true },
    status: { type: String, required: true, enum: DATA_SUBMISSION_STATUSES, default: 'DRAFT' },
    version: { type: Number, required: true, default: 1 },
    studentCount: { type: Number, default: 0 },
    validStudentCount: { type: Number, default: 0 },
    invalidStudentCount: { type: Number, default: 0 },
    duplicateStudentCount: { type: Number, default: 0 },
    totalRowCount: { type: Number, default: 0 },
    studentsConfirmed: { type: Boolean, default: false },
    premiumCalculationId: { type: Schema.Types.ObjectId, ref: 'PremiumCalculation', default: null },
    uploadedFileId: { type: Schema.Types.ObjectId, ref: 'Document', default: null },
    uploadJobId: { type: Schema.Types.ObjectId, ref: 'UploadJob', default: null },
    uploadedFile: fileMeta,
    validation: {
      totalRows: { type: Number, default: 0 },
      validRows: { type: Number, default: 0 },
      invalidRows: { type: Number, default: 0 },
      duplicateRows: { type: Number, default: 0 },
      issues: { type: [Schema.Types.Mixed], default: [] },
      completedAt: { type: Date, default: null }
    },
    reviewComment: { type: String, trim: true, default: '' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    submittedAt: { type: Date, default: null },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    lastCalculatedAt: { type: Date, default: null }
  },
  { timestamps: true, collection: 'dataSubmissions' }
);

dataSubmissionSchema.index({ submissionNumber: 1 }, { unique: true });
dataSubmissionSchema.index({ instituteId: 1, academicYear: 1, status: 1 });
dataSubmissionSchema.index({ instituteId: 1, createdAt: -1 });
dataSubmissionSchema.index({ universityId: 1, academicYear: 1 });
dataSubmissionSchema.index({ universityId: 1, status: 1 });
dataSubmissionSchema.index({ status: 1, submittedAt: -1 });
dataSubmissionSchema.index({ academicYear: 1, submittedAt: -1 });
dataSubmissionSchema.index({ createdAt: -1 });
dataSubmissionSchema.index({ submittedAt: -1 });

export type DataSubmissionDocument = InferSchemaType<typeof dataSubmissionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const DataSubmission = mongoose.model('DataSubmission', dataSubmissionSchema);
