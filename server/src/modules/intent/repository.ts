import { eq } from 'drizzle-orm';
import type { Intent, PrIntentRecord, SynthesisMode } from '@devdigest/shared';
import type { Db } from '../../db/client.js';
import * as t from '../../db/schema.js';

export type PrIntentRow = typeof t.prIntent.$inferSelect;

export interface UpsertIntentMeta {
  inputFingerprint: string;
  model: string;
  computedAt: Date;
}

function rowToIntent(row: PrIntentRow): Intent {
  return {
    intent: row.intent,
    in_scope: row.inScope ?? [],
    out_of_scope: row.outOfScope ?? [],
    confidence: row.confidence ?? 0,
    synthesis_mode: (row.synthesisMode as SynthesisMode) ?? 'inferred_from_signals',
    risk_areas: row.riskAreas ?? [],
    sources: row.sources ?? [],
    missing_inputs: row.missingInputs ?? [],
  };
}

export function rowToPrIntentRecord(row: PrIntentRow): PrIntentRecord {
  return { pr_id: row.prId, ...rowToIntent(row) };
}

/**
 * Persistence for `pr_intent` only — moved here from reviews/pull.repo.
 */
export class IntentRepository {
  constructor(private db: Db) {}

  async getByPrId(prId: string): Promise<PrIntentRow | undefined> {
    const [row] = await this.db.select().from(t.prIntent).where(eq(t.prIntent.prId, prId));
    return row;
  }

  async getIntent(prId: string): Promise<Intent | undefined> {
    const row = await this.getByPrId(prId);
    return row ? rowToIntent(row) : undefined;
  }

  async upsert(prId: string, intent: Intent, meta: UpsertIntentMeta): Promise<void> {
    await this.db
      .insert(t.prIntent)
      .values({
        prId,
        intent: intent.intent,
        inScope: intent.in_scope,
        outOfScope: intent.out_of_scope,
        confidence: intent.confidence,
        synthesisMode: intent.synthesis_mode,
        riskAreas: intent.risk_areas,
        sources: intent.sources,
        missingInputs: intent.missing_inputs,
        inputFingerprint: meta.inputFingerprint,
        model: meta.model,
        computedAt: meta.computedAt,
      })
      .onConflictDoUpdate({
        target: t.prIntent.prId,
        set: {
          intent: intent.intent,
          inScope: intent.in_scope,
          outOfScope: intent.out_of_scope,
          confidence: intent.confidence,
          synthesisMode: intent.synthesis_mode,
          riskAreas: intent.risk_areas,
          sources: intent.sources,
          missingInputs: intent.missing_inputs,
          inputFingerprint: meta.inputFingerprint,
          model: meta.model,
          computedAt: meta.computedAt,
        },
      });
  }
}
