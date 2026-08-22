import { z } from 'zod';
import {
  WireAgentSchema,
  WireConventionsResultSchema,
  WirePrMetaSchema,
  WireRepoSchema,
  WireReviewRecordSchema,
  WireReviewRunResponseSchema,
  WireRunSummarySchema,
} from './wire-schemas.js';
import { DevDigestApiError, type DevDigestApiPort } from '../port/devdigest-api.js';

const HealthSchema = z.object({ status: z.string() }).passthrough();
const AgentsSchema = z.array(WireAgentSchema);
const ReposSchema = z.array(WireRepoSchema);
const PullsSchema = z.array(WirePrMetaSchema);
const RunsSchema = z.array(WireRunSummarySchema);
const ReviewsSchema = z.array(WireReviewRecordSchema);

export type HttpDevDigestClientOptions = {
  apiBase: string;
  fetchImpl?: typeof fetch;
};

/**
 * Infrastructure adapter: HTTP + Zod boundary parsing for the local API.
 */
export class HttpDevDigestClient implements DevDigestApiPort {
  private readonly base: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: HttpDevDigestClientOptions) {
    this.base = opts.apiBase.replace(/\/$/, '');
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const data = await this.getJson('/health', HealthSchema);
      return data.status === 'ok';
    } catch {
      return false;
    }
  }

  listAgents() {
    return this.getJson('/agents', AgentsSchema);
  }

  listRepos() {
    return this.getJson('/repos', ReposSchema);
  }

  listPulls(repoId: string) {
    return this.getJson(`/repos/${encodeURIComponent(repoId)}/pulls`, PullsSchema);
  }

  startReview(prId: string, agentId: string) {
    return this.postJson(
      `/pulls/${encodeURIComponent(prId)}/review`,
      { agentId },
      WireReviewRunResponseSchema,
    );
  }

  listRuns(prId: string) {
    return this.getJson(`/pulls/${encodeURIComponent(prId)}/runs`, RunsSchema);
  }

  listReviews(prId: string) {
    return this.getJson(`/pulls/${encodeURIComponent(prId)}/reviews`, ReviewsSchema);
  }

  listConventions(repoId: string) {
    return this.getJson(
      `/repos/${encodeURIComponent(repoId)}/conventions`,
      WireConventionsResultSchema,
    );
  }

  private async getJson<T>(path: string, schema: z.ZodType<T>): Promise<T> {
    return this.requestJson('GET', path, undefined, schema);
  }

  private async postJson<T>(
    path: string,
    body: unknown,
    schema: z.ZodType<T>,
  ): Promise<T> {
    return this.requestJson('POST', path, body, schema);
  }

  private async requestJson<T>(
    method: 'GET' | 'POST',
    path: string,
    body: unknown | undefined,
    schema: z.ZodType<T>,
  ): Promise<T> {
    const url = `${this.base}${path}`;
    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        method,
        headers: body === undefined ? undefined : { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new DevDigestApiError(0, `DevDigest API unreachable at ${url}: ${message}`);
    }

    const text = await res.text();
    if (!res.ok) {
      throw new DevDigestApiError(
        res.status,
        `DevDigest API ${method} ${path} failed (${res.status}): ${text.slice(0, 500)}`,
        text,
      );
    }

    let json: unknown;
    try {
      json = text === '' ? null : JSON.parse(text);
    } catch {
      throw new DevDigestApiError(
        res.status,
        `DevDigest API ${method} ${path} returned non-JSON`,
        text,
      );
    }

    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      throw new DevDigestApiError(
        res.status,
        `DevDigest API ${method} ${path} response failed schema validation: ${parsed.error.message}`,
        text,
      );
    }
    return parsed.data;
  }
}
