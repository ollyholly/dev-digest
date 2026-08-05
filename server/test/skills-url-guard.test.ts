import { describe, it, expect, vi } from 'vitest';

vi.mock('node:dns/promises', () => ({
  lookup: vi.fn(),
}));

import { lookup } from 'node:dns/promises';
import { assertSafeImportUrl } from '../src/modules/skills/url-guard.js';
import { ValidationError } from '../src/platform/errors.js';

const mockLookup = vi.mocked(lookup);

describe('assertSafeImportUrl (SSRF guard for skill URL import)', () => {
  it('rejects a non-https URL', async () => {
    await expect(assertSafeImportUrl('http://raw.githubusercontent.com/a/b/main/SKILL.md')).rejects.toThrow(
      ValidationError,
    );
  });

  it('rejects a host not on the allowlist', async () => {
    await expect(assertSafeImportUrl('https://example.com/skills/security.md')).rejects.toThrow(ValidationError);
  });

  it('rejects a malformed URL', async () => {
    await expect(assertSafeImportUrl('not a url')).rejects.toThrow(ValidationError);
  });

  it('accepts an allowlisted host resolving to a public IP', async () => {
    mockLookup.mockResolvedValueOnce([{ address: '185.199.108.133', family: 4 }]);
    await expect(
      assertSafeImportUrl('https://raw.githubusercontent.com/some-org/some-repo/main/SKILL.md'),
    ).resolves.toBeUndefined();
  });

  it('rejects an allowlisted hostname that resolves to a loopback address (DNS rebind)', async () => {
    mockLookup.mockResolvedValueOnce([{ address: '127.0.0.1', family: 4 }]);
    await expect(
      assertSafeImportUrl('https://raw.githubusercontent.com/some-org/some-repo/main/SKILL.md'),
    ).rejects.toThrow(ValidationError);
  });

  it('rejects an allowlisted hostname that resolves to a link-local/cloud-metadata address', async () => {
    mockLookup.mockResolvedValueOnce([{ address: '169.254.169.254', family: 4 }]);
    await expect(
      assertSafeImportUrl('https://raw.githubusercontent.com/some-org/some-repo/main/SKILL.md'),
    ).rejects.toThrow(ValidationError);
  });

  it('rejects an allowlisted hostname that resolves to an RFC1918 private address', async () => {
    mockLookup.mockResolvedValueOnce([{ address: '10.0.0.5', family: 4 }]);
    await expect(
      assertSafeImportUrl('https://raw.githubusercontent.com/some-org/some-repo/main/SKILL.md'),
    ).rejects.toThrow(ValidationError);
  });

  it('rejects if ANY resolved address (multi-A-record) is private, not just the first', async () => {
    mockLookup.mockResolvedValueOnce([
      { address: '185.199.108.133', family: 4 },
      { address: '192.168.1.1', family: 4 },
    ]);
    await expect(
      assertSafeImportUrl('https://raw.githubusercontent.com/some-org/some-repo/main/SKILL.md'),
    ).rejects.toThrow(ValidationError);
  });

  it('rejects an IPv6 loopback/unique-local address', async () => {
    mockLookup.mockResolvedValueOnce([{ address: '::1', family: 6 }]);
    await expect(
      assertSafeImportUrl('https://raw.githubusercontent.com/some-org/some-repo/main/SKILL.md'),
    ).rejects.toThrow(ValidationError);
  });
});
