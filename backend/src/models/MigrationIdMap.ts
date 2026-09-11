import mongoose, { Schema, type InferSchemaType } from 'mongoose';

export const MIGRATION_ENTITIES = [
  'university',
  'institute',
  'user',
  'student',
  'enrollment',
  'insurance',
  'document',
  'payment',
  'review',
  'ecard',
  'notification',
  'audit'
] as const;

export type MigrationEntity = (typeof MIGRATION_ENTITIES)[number];

export const migrationIdMapSchema = new Schema(
  {
    entity: { type: String, required: true, enum: MIGRATION_ENTITIES },
    legacyId: { type: String, required: true, trim: true },
    legacySystem: { type: String, required: true, trim: true },
    newId: { type: Schema.Types.ObjectId, required: true },
    runId: { type: String, required: true, trim: true }
  },
  { timestamps: true, collection: 'migrationIdMaps' }
);

migrationIdMapSchema.index({ entity: 1, legacySystem: 1, legacyId: 1 }, { unique: true });
migrationIdMapSchema.index({ newId: 1 });

export type MigrationIdMapDocument = InferSchemaType<typeof migrationIdMapSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const MigrationIdMap = mongoose.model('MigrationIdMap', migrationIdMapSchema);
