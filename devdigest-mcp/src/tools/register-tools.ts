import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod';
import { DevDigestApiError } from '../port/devdigest-api.js';
import type { AgentsService } from '../services/agents.js';
import type { BlastRadiusService } from '../services/blast-radius.js';
import type { ConventionsService } from '../services/conventions.js';
import type { ReviewsService } from '../services/reviews.js';
import {
  GetBlastRadiusInputSchema,
  GetConventionsInputSchema,
  GetFindingsInputSchema,
  ListAgentsInputSchema,
  RunAgentOnPrInputSchema,
} from './schemas.js';

export type ToolServices = {
  agents: AgentsService;
  reviews: ReviewsService;
  conventions: ConventionsService;
  blastRadius: BlastRadiusService;
};

function jsonResult(data: unknown, isError = false): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data) }],
    isError,
  };
}

function errorResult(err: unknown): CallToolResult {
  if (err instanceof DevDigestApiError) {
    return jsonResult(
      {
        error: err.message,
        status: err.status,
      },
      true,
    );
  }
  const message = err instanceof Error ? err.message : String(err);
  return jsonResult({ error: message }, true);
}

type ToolConfig = {
  title: string;
  description: string;
  inputSchema: z.ZodRawShape;
  annotations: {
    readOnlyHint: boolean;
    destructiveHint: boolean;
    openWorldHint: boolean;
  };
};

/**
 * Escape hatch: `McpServer.registerTool` + Zod generics hit TS2589
 * (excessively deep instantiation) under Zod 3 + SDK 1.30. Register with a
 * narrowed function type; runtime validation stays in the handler.
 */
type RegisterToolFn = (
  name: string,
  config: {
    title?: string;
    description?: string;
    inputSchema?: z.ZodRawShape;
    annotations?: ToolConfig['annotations'];
  },
  cb: (args: unknown) => Promise<CallToolResult>,
) => void;

function addTool(
  server: McpServer,
  name: string,
  config: ToolConfig,
  handler: (args: unknown) => Promise<CallToolResult>,
): void {
  const register = server.registerTool.bind(server) as RegisterToolFn;
  register(
    name,
    {
      title: config.title,
      description: config.description,
      inputSchema: config.inputSchema,
      annotations: config.annotations,
    },
    handler,
  );
}

/** Register the five canonical DevDigest MCP tools (verbatim copy from plan). */
export function registerTools(server: McpServer, services: ToolServices): void {
  addTool(
    server,
    'list_agents',
    {
      title: 'List agents',
      description: 'List configured DevDigest review agents.',
      inputSchema: ListAgentsInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async (args) => {
      try {
        const input = ListAgentsInputSchema.parse(args);
        const data = await services.agents.list(input.enabled_only);
        return jsonResult(data);
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  addTool(
    server,
    'run_agent_on_pr',
    {
      title: 'Run agent on PR',
      description: 'Run one agent on a pull request and block until done or 120s timeout.',
      inputSchema: RunAgentOnPrInputSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const input = RunAgentOnPrInputSchema.parse(args);
        const result = await services.reviews.runAndWait(input);
        if (!result.ok) {
          return jsonResult(result.payload, true);
        }
        return jsonResult(result.verdict);
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  addTool(
    server,
    'get_findings',
    {
      title: 'Get findings',
      description: 'Return a compact structured verdict for a completed review run.',
      inputSchema: GetFindingsInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async (args) => {
      try {
        const input = GetFindingsInputSchema.parse(args);
        const data = await services.reviews.getFindingsByRunId(input.run_id);
        return jsonResult(data);
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  addTool(
    server,
    'get_conventions',
    {
      title: 'Get conventions',
      description: 'Return repository conventions from the L02 conventions extractor.',
      inputSchema: GetConventionsInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async (args) => {
      try {
        const input = GetConventionsInputSchema.parse(args);
        const data = await services.conventions.list(input.repo_id, input.status);
        return jsonResult(data);
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  addTool(
    server,
    'get_blast_radius',
    {
      title: 'Get blast radius',
      description: 'Return blast radius for changed files. Lab stub — not implemented yet.',
      inputSchema: GetBlastRadiusInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async (args) => {
      try {
        const input = GetBlastRadiusInputSchema.parse(args);
        const data = services.blastRadius.getStub(input.repo_id, input.changed_files);
        return jsonResult(data);
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
