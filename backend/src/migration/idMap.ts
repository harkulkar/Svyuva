import type { MigrationEntity } from '../models/MigrationIdMap.js';
import type { BoundModels } from './bindModels.js';

export class IdMapStore {
  private memory = new Map<string, string>();

  constructor(
    private readonly models: BoundModels | null,
    private readonly legacySystem: string,
    private readonly runId: string,
    private readonly persist: boolean
  ) {}

  key(entity: MigrationEntity, legacyId: string): string {
    return `${entity}:${legacyId}`;
  }

  get(entity: MigrationEntity, legacyId: string | null | undefined): string | undefined {
    if (!legacyId) return undefined;
    return this.memory.get(this.key(entity, legacyId));
  }

  async load(entity: MigrationEntity, legacyId: string): Promise<string | undefined> {
    const cached = this.get(entity, legacyId);
    if (cached) return cached;
    if (!this.persist || !this.models) return undefined;
    const row = (await this.models.MigrationIdMap.findOne({
      entity,
      legacyId,
      legacySystem: this.legacySystem
    }).lean()) as { newId?: unknown } | null;
    if (row?.newId) {
      const id = String(row.newId);
      this.memory.set(this.key(entity, legacyId), id);
      return id;
    }
    return undefined;
  }

  async set(entity: MigrationEntity, legacyId: string, newId: string): Promise<void> {
    this.memory.set(this.key(entity, legacyId), newId);
    if (!this.persist || !this.models) return;
    await this.models.MigrationIdMap.updateOne(
      { entity, legacyId, legacySystem: this.legacySystem },
      { $set: { entity, legacyId, legacySystem: this.legacySystem, newId, runId: this.runId } },
      { upsert: true }
    );
  }

  snapshot(): Record<string, Record<string, string>> {
    const out: Record<string, Record<string, string>> = {};
    for (const [key, value] of this.memory.entries()) {
      const split = key.indexOf(':');
      const entity = key.slice(0, split);
      const legacyId = key.slice(split + 1);
      out[entity] ??= {};
      out[entity][legacyId] = value;
    }
    return out;
  }
}
