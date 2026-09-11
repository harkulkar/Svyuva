import mongoose, { Schema, type InferSchemaType } from 'mongoose';

export const migrationIssueSchema = new Schema(
  {
    runId: { type: String, required: true, index: true },
    entity: { type: String, required: true },
    legacyId: { type: String, default: null },
    classification: { type: String, required: true },
    code: { type: String, required: true },
    message: { type: String, required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'migrationIssues' }
);

migrationIssueSchema.index({ runId: 1, entity: 1 });

export type MigrationIssueDocument = InferSchemaType<typeof migrationIssueSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const MigrationIssue = mongoose.model('MigrationIssue', migrationIssueSchema);
