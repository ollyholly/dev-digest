/** Runtime config for the local DevDigest MCP server. */

export type McpConfig = {
  apiBase: string;
  pollIntervalMs: number;
  runTimeoutMs: number;
};

const DEFAULT_API_BASE = 'http://localhost:3001';
const DEFAULT_POLL_INTERVAL_MS = 2_000;
const DEFAULT_RUN_TIMEOUT_MS = 120_000;

function requirePositiveInt(raw: string | undefined, fallback: number, name: string): number {
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
    throw new Error(`${name} must be a positive integer, got ${JSON.stringify(raw)}`);
  }
  return n;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): McpConfig {
  const rawBase = env.DEVDIGEST_API_BASE?.trim() || DEFAULT_API_BASE;
  let url: URL;
  try {
    url = new URL(rawBase);
  } catch {
    throw new Error(`DEVDIGEST_API_BASE is not a valid URL: ${JSON.stringify(rawBase)}`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`DEVDIGEST_API_BASE must be http(s), got ${url.protocol}`);
  }

  return {
    apiBase: url.origin + (url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '')),
    pollIntervalMs: requirePositiveInt(
      env.DEVDIGEST_POLL_INTERVAL_MS,
      DEFAULT_POLL_INTERVAL_MS,
      'DEVDIGEST_POLL_INTERVAL_MS',
    ),
    runTimeoutMs: requirePositiveInt(
      env.DEVDIGEST_RUN_TIMEOUT_MS,
      DEFAULT_RUN_TIMEOUT_MS,
      'DEVDIGEST_RUN_TIMEOUT_MS',
    ),
  };
}
