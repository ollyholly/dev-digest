#!/usr/bin/env node
/**
 * Call DevDigest MCP over stdio (same entry as .mcp.json).
 * Usage:
 *   DEVDIGEST_API_BASE=http://localhost:3011 node scripts/call-mcp-tool.mjs <tool> '<json-args>'
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiBase = process.env.DEVDIGEST_API_BASE ?? 'http://localhost:3011';
const tool = process.argv[2];
const argsJson = process.argv[3] ?? '{}';
if (!tool) {
  console.error('usage: call-mcp-tool.mjs <tool> [json-args]');
  process.exit(2);
}
const args = JSON.parse(argsJson);

const transport = new StdioClientTransport({
  command: 'npm',
  args: ['run', 'start', '--prefix', root],
  env: { ...process.env, DEVDIGEST_API_BASE: apiBase },
  stderr: 'inherit',
});

const client = new Client({ name: 'devdigest-mcp-cli', version: '0.0.1' });
await client.connect(transport);
const result = await client.callTool({ name: tool, arguments: args });
const text = result.content?.map((c) => ('text' in c ? c.text : JSON.stringify(c))).join('\n') ?? '';
process.stdout.write(text + (text.endsWith('\n') ? '' : '\n'));
await client.close();
process.exit(result.isError ? 1 : 0);
