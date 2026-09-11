import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { PARENT_RELATIONS, STUDENT_CATEGORIES, STUDENT_GENDERS, STUDENT_SEMESTERS, STUDENT_STATUSES, STUDENT_YEARS } from '../data/studentMaster.js';
import { applyLegacyIndexes, legacyProvenanceDefinition } from './legacyProvenance.js';

export const studentSchema = new Schema(
  {
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', required: true },
    universityId: { type: Schema.Types.ObjectId, ref: 'University', required: true },
    submissionId: { type: Schema.Types.ObjectId, ref: 'DataSubmission', default: null },
    studentId: { type: String, required: true, trim: true },
    enrollmentNumber: { type: String, required: true, trim: true },
    rollNumber: { type: String, required: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    middleName: { type: String, trim: true, default: '' },
    lastName: { type: String, required: true, trim: true },
    gender: { type: String, required: true, enum: STUDENT_GENDERS },
    dateOfBirth: { type: Date, required: true },
    mobile: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    course: { type: String, required: true, trim: true },
    stream: { type: String, trim: true, default: '' },
    year: { type: String, required: true, enum: STUDENT_YEARS },
    semester: { type: String, enum: [...STUDENT_SEMESTERS, ''], default: '' },
    academicYear: { type: String, required: true, trim: true },
    address: { type: String, trim: true, default: '' },
    parentName: { type: String, trim: true, default: '' },
    parentMobile: { type: String, trim: true, default: '' },
    parentRelation: { type: String, enum: [...PARENT_RELATIONS, ''], default: '' },
    parentDateOfBirth: { type: Date, default: null },
    serialNumber: { type: String, trim: true, default: '' },
    age: { type: Number, default: null },
    parentAge: { type: Number, default: null },
    category: { type: String, enum: [...STUDENT_CATEGORIES, ''], default: '' },
    status: { type: String, required: true, enum: STUDENT_STATUSES, default: 'ACTIVE' },
    ...legacyProvenanceDefinition
  },
  { timestamps: true, collection: 'students' }
);

studentSchema.index({ submissionId: 1, instituteId: 1 });
studentSchema.index({ instituteId: 1, academicYear: 1, submissionId: 1 });
studentSchema.index({ universityId: 1, submissionId: 1 });
studentSchema.index({ instituteId: 1, studentId: 1 }, { unique: true });
studentSchema.index({ instituteId: 1, enrollmentNumber: 1 }, { unique: true });
studentSchema.index({ instituteId: 1, academicYear: 1, rollNumber: 1 }, { unique: true });
studentSchema.index({ instituteId: 1, status: 1 });
studentSchema.index({ universityId: 1, academicYear: 1 });
studentSchema.index({ instituteId: 1, mobile: 1 });
studentSchema.index({ instituteId: 1, email: 1 });
studentSchema.index({ createdAt: -1 });
applyLegacyIndexes(studentSchema);

export type StudentDocument = InferSchemaType<typeof studentSchema> & { _id: mongoose.Types.ObjectId };

export const Student = mongoose.model('Student', studentSchema);
