// Deno Edge Function (spike): stateless MCP server over Streamable HTTP, served at /assistant/mcp.
// Uses the official SDK's Web-standard transport; a fresh server + transport per request (no session ids).
// Needs verify_jwt = false (supabase/config.toml) because callers send our own tokens, not Supabase JWTs.
import { McpServer } from 'npm:@modelcontextprotocol/sdk@1.32.2/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from 'npm:@modelcontextprotocol/sdk@1.32.2/server/webStandardStreamableHttp.js';
import { z } from 'npm:zod@3.25.76';
import { probeTomorrow } from '../_shared/sharedProbe.ts';

// Placeholder: real version resolves a dmk_ token hash or a Supabase OAuth JWT to a user id.
function authenticate(req: Request): string | null {
  return req.headers.get('authorization') === 'Bearer test-token' ? 'test-user' : null;
}

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

function buildServer(): McpServer {
  const server = new McpServer({ name: 'daymark-assistant', version: '0.0.1' });
  server.registerTool(
    'ping',
    { description: 'Echo a message back.', inputSchema: { message: z.string() }, annotations: { readOnlyHint: true } },
    ({ message }: { message: string }) => ({ content: [{ type: 'text', text: `pong: ${message}` }] }),
  );
  server.registerTool(
    'probe',
    { description: 'Spike: calls shared code.', inputSchema: {}, annotations: { readOnlyHint: true } },
    () => ({ content: [{ type: 'text', text: probeTomorrow() }] }),
  );
  return server;
}

async function handler(req: Request): Promise<Response> {
  const path = new URL(req.url).pathname.replace(/\/+$/, '');
  if (path.endsWith('/health')) return json(200, { ok: true });
  if (!path.endsWith('/mcp')) return json(404, { error: 'not_found' });
  if (!authenticate(req)) return json(401, { error: 'unauthorized' }, { 'WWW-Authenticate': 'Bearer' });
  const server = buildServer();
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  return transport.handleRequest(req);
}

Deno.serve(handler);
