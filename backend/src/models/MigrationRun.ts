import mongoose, { Schema, type InferSchemaType } from 'mongoose';

export const migrationRunSchema = new Schema(
  {
    runId: { type: String, required: true, unique: true },
    mode: { type: String, required: true, enum: ['dry-run', 'staging', 'verify', 'inventory', 'reconcile', 'storage'] },
    dryRun: { type: Boolean, required: true },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date, default: null },
    sourceKind: { type: String, default: 'none' },
    counts: { type: Schema.Types.Mixed, default: {} },
    notes: { type: [String], default: [] }
  },
  { timestamps: true, collection: 'migrationRuns' }
);

export type MigrationRunDocument = InferSchemaType<typeof migrationRunSchema> & { _id: mongoose.Types.ObjectId };
export const MigrationRun = mongoose.model('MigrationRun', migrationRunSchema);
