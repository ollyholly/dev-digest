import 'dotenv/config';
import { and, eq } from 'drizzle-orm';
import { loadConfig } from '../src/platform/config.js';
import { createDb } from '../src/db/client.js';
import { Container } from '../src/platform/container.js';
import * as t from '../src/db/schema.js';
import { ReviewService } from '../src/modules/reviews/service.js';

/**
 * pr-self-review — manually-triggered only, NEVER wired into a webhook, poller,
 * or CI job. Runs every enabled agent (built-ins + any custom agents, each
 * with its linked Skills) against a PR already imported into the workspace,
 * via the exact same `POST /pulls/:id/review {all:true}` path the studio UI
 * uses — this is a CLI wrapper around that existing capability, not a new
 * review mechanism.
 *
 * Exists to prove the Skills feature end-to-end on DevDigest's own repo: run
 * it against a PR that touches both client/ and server/ and confirm the
 * resulting run traces' "## Skills / rules" prompt section shows skills from
 * agents scoped to both halves of the change.
 *
 * Usage:
 *   npx tsx scripts/pr-self-review.ts <owner>/<repo> <pr-number>
 *
 * The repo + PR must already be imported (Import Repo + synced pulls in the
 * studio) — this script only triggers review runs, it does not import PRs.
 */

async function main() {
  const [fullName, prNumberArg] = process.argv.slice(2);
  if (!fullName || !prNumberArg) {
    console.error('Usage: npx tsx scripts/pr-self-review.ts <owner>/<repo> <pr-number>');
    process.exit(1);
  }
  const prNumber = Number(prNumberArg);
  if (!Number.isInteger(prNumber) || prNumber <= 0) {
    console.error(`Invalid PR number: ${prNumberArg}`);
    process.exit(1);
  }

  const config = loadConfig();
  const { db, close } = createDb(config.databaseUrl);

  try {
    const [repo] = await db.select().from(t.repos).where(eq(t.repos.fullName, fullName));
    if (!repo) {
      console.error(`Repo "${fullName}" is not imported into any workspace. Import it first.`);
      process.exit(1);
    }

    const [pull] = await db
      .select()
      .from(t.pullRequests)
      .where(and(eq(t.pullRequests.repoId, repo.id), eq(t.pullRequests.number, prNumber)));
    if (!pull) {
      console.error(`PR #${prNumber} on "${fullName}" has not been synced. Sync it first.`);
      process.exit(1);
    }

    const container = new Container(config, db);
    const service = new ReviewService(container);

    console.log(`Running every enabled agent against ${fullName}#${prNumber} (self-review, manual only)…`);
    const { runs, reviews } = await service.startReview(repo.workspaceId, pull.id, { all: true }, console);

    console.log(`Started ${runs.length} run(s):`);
    for (const r of runs) console.log(`  - ${r.agent_name} (run ${r.run_id})`);
    console.log(
      `${reviews.length} review(s) completed synchronously; open the PR's Trace panel in the studio to ` +
        `inspect each run's "## Skills / rules" prompt block.`,
    );
  } finally {
    await close();
  }
}

main().catch((err) => {
  console.error('pr-self-review failed:', err);
  process.exit(1);
});
