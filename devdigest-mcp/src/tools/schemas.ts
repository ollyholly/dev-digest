import { z } from 'zod';

/** Canonical tool input schemas — field `.describe()` strings are verbatim from the plan. */

export const ListAgentsInputSchema = z.object({
  enabled_only: z
    .boolean()
    .default(true)
    .describe('If true, return only enabled agents.'),
});

export const RunAgentOnPrInputSchema = z.object({
  repo_id: z.string().describe('DevDigest repository id (UUID).'),
  pr_number: z.coerce.number().int().positive().describe('Pull request number.'),
  agent_id: z.string().describe('Review agent id from list_agents.'),
});

export const GetFindingsInputSchema = z.object({
  run_id: z.string().describe('Review run id returned by run_agent_on_pr.'),
});

export const GetConventionsInputSchema = z.object({
  repo_id: z.string().describe('DevDigest repository id (UUID).'),
  status: z
    .enum(['accepted', 'pending', 'rejected', 'all'])
    .default('accepted')
    .describe('Filter conventions by status. Default accepted.'),
});

export const GetBlastRadiusInputSchema = z.object({
  repo_id: z.string().describe('DevDigest repository id (UUID).'),
  changed_files: z
    .array(z.string())
    .min(1)
    .describe('Repo-relative changed file paths.'),
});
