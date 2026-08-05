import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { ValidationError } from '../../platform/errors.js';

/**
 * SSRF guard for the one user-supplied-URL fetch site in this codebase
 * (`SkillsService.importFromUrl`). A pasted URL is fetched server-side, so
 * without restriction a user could point it at cloud metadata endpoints
 * (169.254.169.254), localhost services, or other internal infra. Only
 * plain HTTPS requests to an allowlisted set of public raw-content hosts
 * are permitted, and the *resolved* IP is checked (not just the hostname)
 * to close the DNS-rebinding gap.
 */
export const ALLOWED_IMPORT_HOSTS = new Set([
  'raw.githubusercontent.com',
  'gist.githubusercontent.com',
]);

/** Throws ValidationError if the URL is not safe to fetch server-side. */
export async function assertSafeImportUrl(rawUrl: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new ValidationError(`Not a valid URL: ${rawUrl}`);
  }

  if (url.protocol !== 'https:') {
    throw new ValidationError(`Only https:// URLs are allowed for skill import, got: ${url.protocol}`);
  }
  if (!ALLOWED_IMPORT_HOSTS.has(url.hostname)) {
    throw new ValidationError(
      `Skill import host "${url.hostname}" is not allowlisted. Allowed hosts: ${[...ALLOWED_IMPORT_HOSTS].join(', ')}`,
    );
  }

  const addresses = isIP(url.hostname)
    ? [url.hostname]
    : (await lookup(url.hostname, { all: true })).map((a) => a.address);

  for (const address of addresses) {
    if (isPrivateOrReservedIp(address)) {
      throw new ValidationError(`Skill import host "${url.hostname}" resolves to a disallowed address`);
    }
  }
}

/** True for loopback, link-local (incl. cloud metadata 169.254.0.0/16), and RFC1918 private ranges. */
function isPrivateOrReservedIp(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b] = address.split('.').map(Number) as [number, number, number, number];
    if (a === 127) return true; // loopback
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 169 && b === 254) return true; // link-local incl. cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 0) return true; // 0.0.0.0/8
    return false;
  }
  // IPv6: loopback (::1), unique local (fc00::/7), link-local (fe80::/10).
  const lower = address.toLowerCase();
  return lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb');
}
