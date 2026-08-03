import { describe, it, expect } from 'vitest';

describe('auto-review module', () => {
  it('exports maybeAutoReviewAfterPoll and saveAutoReviewPrefs', async () => {
    const mod = await import('../src/modules/polling/auto-review.js');
    expect(typeof mod.maybeAutoReviewAfterPoll).toBe('function');
    expect(typeof mod.saveAutoReviewPrefs).toBe('function');
  });
});
