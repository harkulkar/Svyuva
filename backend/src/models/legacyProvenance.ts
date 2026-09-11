import { Schema } from 'mongoose';

export const MIGRATION_CLASSIFICATIONS = ['VALID', 'WARNING', 'REVIEW_REQUIRED', 'SKIPPED', 'FAILED'] as const;
export type MigrationClassification = (typeof MIGRATION_CLASSIFICATIONS)[number];

export const DEFAULT_LEGACY_SYSTEM = 'svyuvasuraksha-legacy';

export const legacyProvenanceDefinition = {
  legacyId: { type: String, trim: true },
  legacySource: { type: String, trim: true },
  legacySystem: { type: String, trim: true },
  migratedAt: { type: Date },
  migrationClassification: { type: String },
  legacyUnmapped: { type: Schema.Types.Mixed }
};

export function applyLegacyIndexes(schema: Schema): void {
  schema.index({ legacyId: 1 }, { sparse: true });
  schema.index(
    { legacySystem: 1, legacyId: 1 },
    {
      unique: true,
      name: 'legacySystem_1_legacyId_1',
      partialFilterExpression: { legacyId: { $type: 'string' }, legacySystem: { $type: 'string' } }
    }
  );
}
