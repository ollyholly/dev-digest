import { eq } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import * as t from '../../db/schema.js';

/** A persisted settings key/value row (non-secret prefs). */
export interface SettingsRow {
  key: string;
  value: unknown;
}

/** F1 — settings data-access layer. The ONLY place that touches `settings`. */
export class SettingsRepository {
  constructor(private db: Db) {}

  async listForWorkspace(workspaceId: string): Promise<SettingsRow[]> {
    return this.db
      .select({ key: t.settings.key, value: t.settings.value })
      .from(t.settings)
      .where(eq(t.settings.workspaceId, workspaceId));
  }

  async upsert(workspaceId: string, userId: string, key: string, value: unknown): Promise<void> {
    await this.db
      .insert(t.settings)
      .values({ workspaceId, userId, key, value })
      .onConflictDoUpdate({
        target: [t.settings.workspaceId, t.settings.userId, t.settings.key],
        set: { value },
      });
  }
}
