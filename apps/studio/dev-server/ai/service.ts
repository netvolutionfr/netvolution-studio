// AI service of the development server (CS-11, ADR-0014): provider choice from the environment,
// limits (tokens per request, requests per minute, daily token budget), technical journal without
// content. Keys stay here: neither the Studio nor the exports ever receive them.
import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import {
  AiError,
  type AiProvider,
  type AiRequest,
  type AiResponse,
  type AiStatus,
  type Message,
  msg,
} from '@ns/core';
import { anthropicProvider } from './anthropic.ts';
import { openAiProvider } from './openai.ts';
import { simulatedProvider } from './simulated.ts';

export type AiConfig = {
  provider: AiProvider | null;
  /** Why no provider is configured (shown in the Studio). */
  reason?: Message;
  maxTokens: number;
  perMinute: number;
  dailyTokens: number;
  /** JSON lines: date, provider, model, duration, tokens, status; never prompts or answers. */
  logFile?: string;
};

const DEFAULTS = { maxTokens: 4000, perMinute: 10, dailyTokens: 200_000 };
const int = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

/**
 * Configuration from environment variables (see `.env.example`): NS_AI_PROVIDER = anthropic | openai
 * | simulated; disabled when unset or when the required key is missing.
 */
export function aiConfigFromEnv(env: NodeJS.ProcessEnv, logFile?: string): AiConfig {
  const limits = {
    maxTokens: int(env.NS_AI_MAX_TOKENS, DEFAULTS.maxTokens),
    perMinute: int(env.NS_AI_REQUESTS_PER_MINUTE, DEFAULTS.perMinute),
    dailyTokens: int(env.NS_AI_DAILY_TOKENS, DEFAULTS.dailyTokens),
    ...(logFile ? { logFile } : {}),
  };
  const off = (reason: Message): AiConfig => ({ provider: null, reason, ...limits });
  switch (env.NS_AI_PROVIDER) {
    case 'anthropic':
      return env.ANTHROPIC_API_KEY
        ? {
            provider: anthropicProvider({ apiKey: env.ANTHROPIC_API_KEY, model: env.NS_AI_MODEL }),
            ...limits,
          }
        : off(msg('ai.errors.noAnthropicKey'));
    case 'openai':
      return env.NS_AI_MODEL
        ? {
            provider: openAiProvider({
              baseUrl: env.NS_AI_BASE_URL || 'https://api.openai.com/v1',
              model: env.NS_AI_MODEL,
              apiKey: env.OPENAI_API_KEY,
            }),
            ...limits,
          }
        : off(msg('ai.errors.noOpenAiModel'));
    case 'simulated':
      return { provider: simulatedProvider(), ...limits };
    case undefined:
    case '':
      return off(msg('ai.errors.noProvider'));
    default:
      return off(msg('ai.errors.unknownProvider', { provider: env.NS_AI_PROVIDER }));
  }
}

export function createAiService(config: AiConfig) {
  const recent: number[] = [];
  let day = '';
  let used = 0;
  const today = () => new Date().toISOString().slice(0, 10);
  const usedToday = () => (day === today() ? used : 0);

  const log = async (entry: Record<string, unknown>) => {
    if (!config.logFile) return;
    await mkdir(dirname(config.logFile), { recursive: true });
    await appendFile(config.logFile, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`).catch(
      () => {},
    );
  };

  return {
    status(): AiStatus {
      return {
        enabled: config.provider !== null,
        provider: config.provider?.id ?? null,
        model: config.provider?.model ?? null,
        ...(config.reason ? { reason: config.reason } : {}),
        limits: { maxTokens: config.maxTokens, perMinute: config.perMinute, dailyTokens: config.dailyTokens },
        usedToday: usedToday(),
      };
    },
    /** One request to the provider, within the limits; failures are AiError with a stable code. */
    async complete(request: AiRequest): Promise<AiResponse> {
      const provider = config.provider;
      if (!provider) throw new AiError('disabled', config.reason ?? msg('ai.errors.disabled'));
      const now = Date.now();
      while (recent.length && (recent[0] as number) < now - 60_000) recent.shift();
      if (recent.length >= config.perMinute)
        throw new AiError('rate-limit', msg('ai.errors.perMinute', { count: config.perMinute }));
      if (usedToday() >= config.dailyTokens)
        throw new AiError('budget', msg('ai.errors.budget', { count: config.dailyTokens }));
      recent.push(now);
      const started = Date.now();
      try {
        const response = await provider.complete({
          ...request,
          maxTokens: Math.min(request.maxTokens, config.maxTokens),
        });
        if (day !== today()) [day, used] = [today(), 0];
        used += response.usage.inputTokens + response.usage.outputTokens;
        await log({
          provider: provider.id,
          model: response.model,
          ms: Date.now() - started,
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
          toolCalls: response.toolCalls.length,
          truncated: response.truncated,
          status: 'ok',
        });
        return response;
      } catch (error) {
        const code = error instanceof AiError ? error.code : 'invalid-response';
        await log({
          provider: provider.id,
          model: provider.model,
          ms: Date.now() - started,
          status: 'error',
          code,
        });
        throw error instanceof AiError
          ? error
          : new AiError('invalid-response', msg('ai.errors.invalidResponse'));
      }
    },
  };
}
