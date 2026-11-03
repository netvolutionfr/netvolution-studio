import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type AiError, type AiRequest, tm } from '@ns/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anthropicProvider } from './anthropic.ts';
import { openAiProvider } from './openai.ts';
import { aiConfigFromEnv, createAiService } from './service.ts';
import { simulatedProvider } from './simulated.ts';

const SECRET = 'sk-test-NE-JAMAIS-EXPOSER';
const request: AiRequest = {
  system: 'Tu proposes des opérations du Studio.',
  messages: [{ role: 'user', content: 'Texte confidentiel du client à reformuler' }],
  tools: [
    {
      name: 'updateNodeProps',
      description: 'Modifie des propriétés',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
        additionalProperties: false,
      },
    },
  ],
  maxTokens: 1000,
};

/** Fake provider endpoint: records the last request, answers with `reply(status, body)`. */
let last: { url: string; headers: IncomingMessage['headers']; body: Record<string, unknown> } | null = null;
let reply: { status: number; body: unknown } = { status: 200, body: {} };
let base = '';
let close = () => {};
beforeAll(async () => {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    last = {
      url: req.url ?? '',
      headers: req.headers,
      body: JSON.parse(Buffer.concat(chunks).toString() || '{}'),
    };
    res.writeHead(reply.status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(reply.body));
  });
  await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok));
  const addr = server.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
  close = () => server.close();
});
afterAll(() => close());

const code = async (p: Promise<unknown>) =>
  p.then(
    () => 'ok',
    (e: AiError) => e.code,
  );

describe('Anthropic provider (official SDK)', () => {
  const provider = () => anthropicProvider({ apiKey: SECRET, baseURL: base, maxRetries: 0 });
  const message = (content: unknown[], stop = 'tool_use') => ({
    id: 'msg_1',
    type: 'message',
    role: 'assistant',
    model: 'claude-opus-5-5',
    content,
    stop_reason: stop,
    usage: { input_tokens: 120, output_tokens: 40 },
  });

  it('sends the Messages API request with tools, effort and refusal fallback; reads text and tool calls', async () => {
    reply = {
      status: 200,
      body: message([
        { type: 'thinking', thinking: '', signature: 'x' },
        { type: 'text', text: 'Voici une proposition.' },
        { type: 'tool_use', id: 'toolu_1', name: 'updateNodeProps', input: { id: 'nabc12345' } },
      ]),
    };
    const r = await provider().complete(request);
    expect(r).toEqual({
      text: 'Voici une proposition.',
      toolCalls: [{ name: 'updateNodeProps', input: { id: 'nabc12345' } }],
      usage: { inputTokens: 120, outputTokens: 40 },
      model: 'claude-opus-5-5',
      truncated: false,
    });
    expect(last?.url).toMatch(/^\/v1\/messages/);
    // SDK 1.x: the key travels as a bearer token, with a pinned API version.
    expect(last?.headers.authorization).toBe(`Bearer ${SECRET}`);
    expect(last?.headers['anthropic-version']).toBeTruthy();
    expect(String(last?.headers['anthropic-beta'])).toContain('server-side-fallback-2026-07-01');
    expect(last?.body).toMatchObject({
      model: 'claude-opus-5-5',
      max_tokens: 1000,
      fallbacks: 'default',
      output_config: { effort: 'medium' },
      system: request.system,
      tool_choice: { type: 'auto' },
      tools: [{ name: 'updateNodeProps', input_schema: { type: 'object' } }],
    });
  });

  it('maps refusals, truncation and HTTP errors to stable codes, without the provider payload', async () => {
    reply = { status: 200, body: message([], 'refusal') };
    expect(await code(provider().complete(request))).toBe('refused');
    reply = { status: 200, body: message([{ type: 'text', text: 'début' }], 'max_tokens') };
    expect((await provider().complete(request)).truncated).toBe(true);
    for (const [status, expected] of [
      [401, 'auth'],
      [429, 'rate-limit'],
      [400, 'bad-request'],
      [529, 'unavailable'],
    ] as const) {
      reply = { status, body: { type: 'error', error: { type: 'x', message: 'détail interne' } } };
      expect(await code(provider().complete(request))).toBe(expected);
    }
  });
});

describe('OpenAI-compatible provider', () => {
  it('sends chat completions with function tools and reads tool calls', async () => {
    reply = {
      status: 200,
      body: {
        model: 'local-model',
        choices: [
          {
            finish_reason: 'tool_calls',
            message: {
              content: null,
              tool_calls: [{ function: { name: 'updateNodeProps', arguments: '{"id":"nabc12345"}' } }],
            },
          },
        ],
        usage: { prompt_tokens: 50, completion_tokens: 10 },
      },
    };
    const r = await openAiProvider({ baseUrl: `${base}/v1/`, model: 'local-model', apiKey: SECRET }).complete(
      request,
    );
    expect(r).toMatchObject({
      toolCalls: [{ name: 'updateNodeProps', input: { id: 'nabc12345' } }],
      usage: { inputTokens: 50 },
    });
    expect(last?.url).toBe('/v1/chat/completions');
    expect(last?.headers.authorization).toBe(`Bearer ${SECRET}`);
    expect(last?.body).toMatchObject({
      tool_choice: 'auto',
      tools: [{ type: 'function', function: { name: 'updateNodeProps' } }],
      messages: [{ role: 'system' }, { role: 'user' }],
    });
    reply = { status: 429, body: {} };
    expect(await code(openAiProvider({ baseUrl: base, model: 'm' }).complete(request))).toBe('rate-limit');
  });
});

describe('AI service', () => {
  let dir = '';
  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'ns-ai-'));
  });
  afterAll(() => rm(dir, { recursive: true }));

  it('is disabled without a provider or a key, and never reports a key', () => {
    expect(aiConfigFromEnv({}).provider).toBeNull();
    const missing = aiConfigFromEnv({ NS_AI_PROVIDER: 'anthropic' });
    expect([missing.provider, missing.reason && tm(missing.reason)]).toEqual([
      null,
      expect.stringMatching(/ANTHROPIC_API_KEY is missing/),
    ]);
    const on = createAiService(aiConfigFromEnv({ NS_AI_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: SECRET }));
    expect(on.status()).toMatchObject({ enabled: true, provider: 'anthropic', model: 'claude-opus-5-5' });
    expect(JSON.stringify(on.status())).not.toContain(SECRET);
  });

  it('enforces the request rate and the daily budget, caps tokens, and logs without content', async () => {
    const logFile = join(dir, 'ai-log.jsonl');
    let asked = 0;
    const service = createAiService({
      provider: simulatedProvider((r) => {
        asked = r.maxTokens;
        return { text: 'ok' };
      }),
      maxTokens: 300,
      perMinute: 2,
      dailyTokens: 1_000_000,
      logFile,
    });
    await service.complete(request);
    expect(asked).toBe(300);
    await service.complete(request);
    expect(await code(service.complete(request))).toBe('rate-limit');
    const log = await readFile(logFile, 'utf8');
    expect(log.trim().split('\n')).toHaveLength(2);
    expect(log).not.toContain('confidentiel');
    expect(JSON.parse(log.split('\n')[0] ?? '{}')).toMatchObject({
      provider: 'simulated',
      status: 'ok',
      toolCalls: 0,
    });
    const poor = createAiService({
      provider: simulatedProvider(),
      maxTokens: 300,
      perMinute: 10,
      dailyTokens: 1,
    });
    await poor.complete(request);
    expect(await code(poor.complete(request))).toBe('budget');
  });
});

describe('secrets never leave the server', () => {
  it('the Studio client code never reads keys or the environment', async () => {
    const root = join(import.meta.dirname, '../../src');
    const files = (await readdir(root, { recursive: true })).filter((f) => /\.(ts|tsx)$/.test(f));
    for (const f of files) {
      const src = await readFile(join(root, f), 'utf8');
      expect(src, f).not.toMatch(/API_KEY|process\.env|import\.meta\.env\.(?!DEV|PROD|MODE)/);
    }
  });
});
