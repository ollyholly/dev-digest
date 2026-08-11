import { isIP } from 'node:net';
import dns from 'node:dns/promises';
import type { HttpClient, HttpGetOptions, HttpGetResult } from './types.js';

const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_BYTES = 64 * 1024;

/** True when `ip` is loopback, private, link-local, ULA, or CGNAT. */
export function isPrivateOrBlockedIp(ip: string): boolean {
  const v = isIP(ip);
  if (v === 0) return true;
  if (v === 4) {
    const parts = ip.split('.').map(Number);
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b !== undefined && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b !== undefined && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }
  const lower = ip.toLowerCase();
  if (lower === '::1') return true;
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
  if (lower.startsWith('fe80:')) return true;
  return false;
}

async function assertResolvedAddressesPublic(hostname: string): Promise<boolean> {
  try {
    const records = await dns.lookup(hostname, { all: true, verbatim: true });
    if (records.length === 0) return false;
    for (const r of records) {
      if (isPrivateOrBlockedIp(r.address)) return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function readBodyCapped(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number,
): Promise<string> {
  if (!body) return '';
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;
      const remaining = maxBytes - total;
      if (remaining <= 0) {
        // Drain is skipped — cancel to stop upstream.
        await reader.cancel().catch(() => undefined);
        break;
      }
      if (value.byteLength <= remaining) {
        chunks.push(value);
        total += value.byteLength;
      } else {
        chunks.push(value.subarray(0, remaining));
        total = maxBytes;
        await reader.cancel().catch(() => undefined);
        break;
      }
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8');
}

/**
 * Allowlisted / SSRF-aware HTTP GET. Used for plan/spec URL fetches.
 * Does not follow redirects (`redirect: 'error'`).
 */
export class SafeHttpClient implements HttpClient {
  async getText(urlStr: string, opts: HttpGetOptions = {}): Promise<HttpGetResult> {
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
    const blockPrivate =
      opts.blockPrivateIps ?? (opts.allowedHosts !== undefined && opts.allowedHosts.size > 0);

    let url: URL;
    try {
      url = new URL(urlStr);
    } catch {
      return { ok: false };
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return { ok: false };

    const host = url.hostname.toLowerCase();
    if (opts.allowedHosts && opts.allowedHosts.size > 0 && !opts.allowedHosts.has(host)) {
      return { ok: false };
    }

    if (blockPrivate) {
      if (isIP(host)) {
        if (isPrivateOrBlockedIp(host)) return { ok: false };
      } else {
        const publicOk = await assertResolvedAddressesPublic(host);
        if (!publicOk) return { ok: false };
      }
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url.toString(), {
        method: 'GET',
        redirect: 'error',
        signal: ctrl.signal,
        headers: { Accept: 'text/plain, text/markdown, text/html, */*' },
      });
      if (!res.ok) return { ok: false, status: res.status };
      const text = await readBodyCapped(res.body, maxBytes);
      return { ok: true, status: res.status, text };
    } catch {
      return { ok: false };
    } finally {
      clearTimeout(timer);
    }
  }
}
