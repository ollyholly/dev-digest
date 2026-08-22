import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpDevDigestClient } from '../src/adapter/http-devdigest-client.js';
import { DevDigestApiError } from '../src/port/devdigest-api.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HttpDevDigestClient', () => {
  it('parses GET /agents', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify([
          {
            id: 'a1',
            name: 'General',
            description: 'd',
            provider: 'openrouter',
            model: 'm',
            system_prompt: 'p',
            enabled: true,
            version: 1,
            strategy: 'single-pass',
            ci_fail_on: 'critical',
            repo_intel: true,
          },
        ]),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const client = new HttpDevDigestClient({
      apiBase: 'http://localhost:3001',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const agents = await client.listAgents();
    expect(agents).toHaveLength(1);
    expect(agents[0]?.name).toBe('General');
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:3001/agents',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('POSTs agentId to /pulls/:id/review', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          pr_id: 'pr-1',
          runs: [{ run_id: 'run-1', agent_id: 'a1', agent_name: 'General' }],
          reviews: [],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const client = new HttpDevDigestClient({
      apiBase: 'http://localhost:3001',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const res = await client.startReview('pr-1', 'a1');
    expect(res.runs[0]?.run_id).toBe('run-1');
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:3001/pulls/pr-1/review',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ agentId: 'a1' }),
      }),
    );
  });

  it('maps HTTP errors to DevDigestApiError', async () => {
    const fetchImpl = vi.fn(
      async () => new Response('nope', { status: 503 }),
    );
    const client = new HttpDevDigestClient({
      apiBase: 'http://localhost:3001',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(client.listAgents()).rejects.toBeInstanceOf(DevDigestApiError);
    await expect(client.listAgents()).rejects.toMatchObject({ status: 503 });
  });

  it('healthCheck returns false when unreachable', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('ECONNREFUSED');
    });
    const client = new HttpDevDigestClient({
      apiBase: 'http://localhost:3001',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(await client.healthCheck()).toBe(false);
  });
});
