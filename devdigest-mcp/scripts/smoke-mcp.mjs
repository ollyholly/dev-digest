#!/usr/bin/env node
/**
 * One-shot stdio smoke: list tools + call list_agents / get_blast_radius.
 * Usage: node scripts/smoke-mcp.mjs
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiBase = process.env.DEVDIGEST_API_BASE ?? 'http://localhost:3011';

const transport = new StdioClientTransport({
  command: 'npm',
  args: ['run', 'start', '--prefix', root],
  env: { ...process.env, DEVDIGEST_API_BASE: apiBase },
  stderr: 'pipe',
});

const client = new Client({ name: 'devdigest-smoke', version: '0.0.0' });
await client.connect(transport);

const tools = await client.listTools();
console.log(
  'tools:',
  tools.tools.map((t) => t.name).join(', '),
);

const agents = await client.callTool({
  name: 'list_agents',
  arguments: { enabled_only: true },
});
console.log('list_agents:', agents.content?.[0]?.text?.slice(0, 400));

const blast = await client.callTool({
  name: 'get_blast_radius',
  arguments: {
    repo_id: '00000000-0000-0000-0000-000000000001',
    changed_files: ['src/index.ts'],
  },
});
console.log('get_blast_radius:', blast.content?.[0]?.text);

await client.close();
process.exit(0);
