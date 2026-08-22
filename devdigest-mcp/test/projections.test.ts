import { describe, expect, it } from 'vitest';
import type { WireFinding, WireReviewRecord } from '../src/adapter/wire-schemas.js';
import { projectAgents } from '../src/projections/agents.js';
import { projectConventions } from '../src/projections/conventions.js';
import { projectCompactVerdict } from '../src/projections/reviews.js';
import { BlastRadiusService } from '../src/services/blast-radius.js';

function finding(i: number, severity: WireFinding['severity'] = 'WARNING'): WireFinding {
  return {
    severity,
    title: `Finding ${i}`,
    file: `src/${i}.ts`,
    start_line: i,
    end_line: i,
  };
}

describe('projections', () => {
  it('omits system_prompt from agents', () => {
    const out = projectAgents([
      {
        id: 'a1',
        name: 'General',
        description: 'd',
        provider: 'openrouter',
        model: 'm',
        system_prompt: 'SECRET PROMPT',
        enabled: true,
        repo_intel: true,
      },
    ]);
    expect(out.agents[0]).toEqual({
      id: 'a1',
      name: 'General',
      description: 'd',
      provider: 'openrouter',
      model: 'm',
      enabled: true,
      repo_intel: true,
    });
    expect(JSON.stringify(out)).not.toContain('SECRET');
  });

  it('counts severities and caps findings at 20', () => {
    const findings = [
      ...Array.from({ length: 15 }, (_, i) => finding(i, 'WARNING')),
      ...Array.from({ length: 10 }, (_, i) => finding(100 + i, 'CRITICAL')),
    ];
    const review: WireReviewRecord = {
      id: 'rev-1',
      pr_id: 'pr-1',
      agent_id: 'a1',
      run_id: 'run-1',
      agent_name: 'General',
      kind: 'review',
      verdict: 'request_changes',
      summary: 's',
      score: 10,
      findings,
    };
    const out = projectCompactVerdict(review, 'run-1');
    expect(out.severity_counts).toEqual({ CRITICAL: 10, WARNING: 15, SUGGESTION: 0 });
    expect(out.findings).toHaveLength(20);
    expect(out.findings_truncated).toBe(true);
  });

  it('filters conventions by status (default accepted)', () => {
    const result = {
      candidates: [
        {
          id: '1',
          category: 'naming',
          rule: 'use camelCase',
          evidence_path: 'a.ts',
          confidence: 0.8,
          status: 'accepted' as const,
          scanned_sha: 'sha',
        },
        {
          id: '2',
          category: 'naming',
          rule: 'pending rule',
          evidence_path: 'b.ts',
          confidence: 0.5,
          status: 'pending' as const,
          scanned_sha: 'sha',
        },
      ],
      scanned_sha: 'sha',
    };

    const accepted = projectConventions('r', result, 'accepted');
    expect(accepted.conventions).toHaveLength(1);
    expect(accepted.conventions[0]?.id).toBe('1');

    const all = projectConventions('r', result, 'all');
    expect(all.conventions).toHaveLength(2);
  });

  it('blast radius stub is honest', () => {
    const stub = new BlastRadiusService().getStub('repo-1', ['src/a.ts']);
    expect(stub).toEqual({
      implemented: false,
      message:
        'Blast radius is not implemented in the lab build. Complete the L04 homework to wire repo-intel.',
      repo_id: 'repo-1',
      changed_files: ['src/a.ts'],
    });
  });
});
