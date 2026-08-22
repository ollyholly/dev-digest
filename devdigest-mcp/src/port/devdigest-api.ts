import type {
  WireAgent,
  WireConventionsResult,
  WirePrMeta,
  WireRepo,
  WireReviewRecord,
  WireReviewRunResponse,
  WireRunSummary,
} from '../adapter/wire-schemas.js';

/** Typed HTTP / transport failure from the DevDigest API. */
export class DevDigestApiError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(status: number, message: string, body = '') {
    super(message);
    this.name = 'DevDigestApiError';
    this.status = status;
    this.body = body;
  }
}

/**
 * Port the MCP application layer depends on — no fetch / URL details here.
 * Implemented by `HttpDevDigestClient`.
 */
export interface DevDigestApiPort {
  healthCheck(): Promise<boolean>;
  listAgents(): Promise<WireAgent[]>;
  listRepos(): Promise<WireRepo[]>;
  listPulls(repoId: string): Promise<WirePrMeta[]>;
  startReview(prId: string, agentId: string): Promise<WireReviewRunResponse>;
  listRuns(prId: string): Promise<WireRunSummary[]>;
  listReviews(prId: string): Promise<WireReviewRecord[]>;
  listConventions(repoId: string): Promise<WireConventionsResult>;
}
