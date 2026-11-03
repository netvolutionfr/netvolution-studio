import { z } from 'zod';

/**
 * Contract between the Studio and the AI providers (CS-11, ADR-0014), independent of any provider.
 * The core never calls a model: providers live on the server, which holds the keys.
 */
export type AiMessage = { role: 'user' | 'assistant'; content: string };
/** A tool offered to the model: a business command of the catalog (ADR-0013). */
export type AiTool = { name: string; description: string; inputSchema: Record<string, unknown> };
export type AiRequest = {
  system: string;
  messages: AiMessage[];
  tools?: AiTool[] | undefined;
  maxTokens: number;
};
export type AiToolCall = { name: string; input: unknown };
export type AiResponse = {
  text: string;
  toolCalls: AiToolCall[];
  usage: { inputTokens: number; outputTokens: number };
  model: string;
  /** The answer was cut by the token limit: proposals built from it must not be trusted as complete. */
  truncated: boolean;
};
export interface AiProvider {
  readonly id: 'anthropic' | 'openai' | 'simulated';
  readonly model: string;
  complete(request: AiRequest): Promise<AiResponse>;
}

export type AiErrorCode =
  | 'disabled'
  | 'too-large'
  | 'rate-limit'
  | 'budget'
  | 'auth'
  | 'refused'
  | 'timeout'
  | 'unavailable'
  | 'bad-request'
  | 'invalid-response';

/** Provider failures as stable codes with a message for the user (never the provider's raw payload). */
export class AiError extends Error {
  readonly code: AiErrorCode;
  constructor(code: AiErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

/** Bounds of a request from the Studio (checked again by the server). */
export const AI_LIMITS = { system: 30_000, content: 60_000, tools: 64 } as const;

export const aiRequestSchema = z.strictObject({
  system: z.string().max(AI_LIMITS.system),
  messages: z
    .array(
      z.strictObject({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(AI_LIMITS.content),
      }),
    )
    .min(1)
    .max(20)
    .refine((m) => m.reduce((n, x) => n + x.content.length, 0) <= AI_LIMITS.content, 'Contenu trop long'),
  tools: z
    .array(
      z.strictObject({
        name: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
        description: z.string().max(1000),
        inputSchema: z.record(z.string(), z.unknown()),
      }),
    )
    .max(AI_LIMITS.tools)
    .optional(),
  maxTokens: z.number().int().min(1).max(64_000),
});

/** What the server tells the Studio about the assistant: never a key. */
export type AiStatus = {
  enabled: boolean;
  provider: AiProvider['id'] | null;
  model: string | null;
  /** Why the assistant is disabled, when it is. */
  reason?: string;
  limits: { maxTokens: number; perMinute: number; dailyTokens: number };
  usedToday: number;
};
