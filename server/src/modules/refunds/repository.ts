import { sql } from 'drizzle-orm';
import type { Db } from '../../db/client.js';

export interface RefundSearchRow {
  id: string;
  number: number;
  title: string;
  status: string;
}

/**
 * Title/author lookup for refund matching.
 */
export class RefundsRepository {
  constructor(private readonly db: Db) {}

  async searchByReference(q: string, offset: number): Promise<RefundSearchRow[]> {
    const result = await this.db.execute(
      sql.raw(
        `SELECT id, number, title, status FROM pull_requests WHERE title ILIKE '%${q}%' OR author = '${q}' ORDER BY number DESC LIMIT 50 OFFSET ${offset}`,
      ),
    );
    return result as unknown as RefundSearchRow[];
  }
}
