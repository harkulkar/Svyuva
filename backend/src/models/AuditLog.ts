import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { applyLegacyIndexes, legacyProvenanceDefinition } from './legacyProvenance.js';

export const auditLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    action: { type: String, required: true, index: true },
    entity: { type: String, default: 'User' },
    entityId: { type: String, default: null },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
    migratedHistorical: { type: Boolean, default: false },
    ...legacyProvenanceDefinition
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'auditLogs' }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ entity: 1, createdAt: -1 });
auditLogSchema.index({ entity: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
applyLegacyIndexes(auditLogSchema);

export type AuditLogDocument = InferSchemaType<typeof auditLogSchema> & { _id: mongoose.Types.ObjectId };

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
