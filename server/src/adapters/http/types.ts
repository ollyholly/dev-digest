/**
 * Outbound HTTP port (server-local). Feature modules must not call global
 * `fetch` — go through Container.http so tests can inject mocks and SSRF
 * policy lives on the outer ring.
 */
export interface HttpGetOptions {
  /** Abort after this many ms (default 5000). */
  timeoutMs?: number;
  /** Cap response body bytes (default 64 KiB). Excess is truncated, not buffered fully. */
  maxBytes?: number;
  /** When set, hostname must be in this set (case-insensitive). */
  allowedHosts?: ReadonlySet<string>;
  /**
   * Resolve DNS and reject private / link-local / loopback / ULA / CGNAT
   * addresses (and literal IP hosts). Default true when `allowedHosts` is set,
   * otherwise false.
   */
  blockPrivateIps?: boolean;
}

export interface HttpGetResult {
  ok: boolean;
  status?: number;
  /** UTF-8 body, truncated to maxBytes when ok. */
  text?: string;
}

export interface HttpClient {
  getText(url: string, opts?: HttpGetOptions): Promise<HttpGetResult>;
}
