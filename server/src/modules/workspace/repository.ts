import { eq } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import * as t from '../../db/schema.js';

export type RepoRow = typeof t.repos.$inferSelect;

/** F1 — workspace data-access layer. Read-only: repos summary for one workspace. */
export class WorkspaceRepository {
  constructor(private db: Db) {}

  async listRepos(workspaceId: string): Promise<RepoRow[]> {
    return this.db.select().from(t.repos).where(eq(t.repos.workspaceId, workspaceId));
  }
}
