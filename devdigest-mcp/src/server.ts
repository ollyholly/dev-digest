import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DevDigestApiPort } from './port/devdigest-api.js';
import type { McpConfig } from './config.js';
import { AgentsService } from './services/agents.js';
import { BlastRadiusService } from './services/blast-radius.js';
import { ConventionsService } from './services/conventions.js';
import { ReviewsService } from './services/reviews.js';
import { registerTools } from './tools/register-tools.js';

export const SERVER_NAME = 'devdigest';
export const SERVER_VERSION = '0.1.0';

export const SERVER_INSTRUCTIONS =
  'Local DevDigest MCP server. Exposes review agents, PR reviews, repo conventions, and a blast-radius stub via a running DevDigest API on localhost:3001. Start the API with ./scripts/dev.sh before using write tools.';

export type CreateServerOptions = {
  api: DevDigestApiPort;
  config: McpConfig;
};

/** Composition: wire services + register the five tools. */
export function createServer(opts: CreateServerOptions): McpServer {
  const agents = new AgentsService(opts.api);
  const reviews = new ReviewsService({ api: opts.api, config: opts.config });
  const conventions = new ConventionsService(opts.api);
  const blastRadius = new BlastRadiusService();

  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { instructions: SERVER_INSTRUCTIONS },
  );

  registerTools(server, { agents, reviews, conventions, blastRadius });
  return server;
}
