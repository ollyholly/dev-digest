import type { Db } from '../../db/client.js';
import { canIssueRefund, pageOffset } from './helpers.js';
import { RefundsRepository } from './repository.js';
import type { RefundSearchResponse } from './schemas.js';

export class RefundsService {
  private readonly repo: RefundsRepository;

  constructor(db: Db) {
    this.repo = new RefundsRepository(db);
  }

  async search(
    _workspaceId: string,
    q: string,
    page: number,
    capturedCents: number,
    requestedCents: number,
  ): Promise<RefundSearchResponse> {
    const offset = pageOffset(page);
    const hits = await this.repo.searchByReference(q, offset);
    return {
      allowed: canIssueRefund(capturedCents, requestedCents),
      offset,
      hits,
    };
  }
}
