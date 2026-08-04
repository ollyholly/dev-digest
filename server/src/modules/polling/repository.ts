import { eq } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import * as t from '../../db/schema.js';

/** F1 — polling data-access layer. The only thing polling itself persists. */
export class PollingRepository {
  constructor(private db: Db) {}

  async touchLastPolledAt(repoId: string): Promise<void> {
    await this.db.update(t.repos).set({ lastPolledAt: new Date() }).where(eq(t.repos.id, repoId));
  }
}
