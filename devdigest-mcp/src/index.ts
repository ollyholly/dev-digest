#!/usr/bin/env node
/**
 * Composition root — stdio MCP entry. Never log to stdout (JSON-RPC channel).
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { HttpDevDigestClient } from './adapter/http-devdigest-client.js';
import { loadConfig } from './config.js';
import { createServer } from './server.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const api = new HttpDevDigestClient({ apiBase: config.apiBase });

  const healthy = await api.healthCheck();
  if (!healthy) {
    console.error(
      `[devdigest-mcp] warning: API health check failed at ${config.apiBase}/health — start with ./scripts/dev.sh before write tools`,
    );
  } else {
    console.error(`[devdigest-mcp] connected to API at ${config.apiBase}`);
  }

  const server = createServer({ api, config });
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[devdigest-mcp] listening on stdio');
}

main().catch((err) => {
  console.error('[devdigest-mcp] fatal:', err);
  process.exit(1);
});
