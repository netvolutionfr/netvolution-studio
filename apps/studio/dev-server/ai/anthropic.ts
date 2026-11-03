// Anthropic provider (ADR-0014): Messages API through the official SDK, server-side only.
import Anthropic from '@anthropic-ai/sdk';
import { AiError, type AiProvider, type AiRequest, type AiResponse, msg } from '@ns/core';

export const ANTHROPIC_DEFAULT_MODEL = 'claude-opus-5-5';

export function anthropicProvider(options: {
  apiKey: string;
  model?: string | undefined;
  baseURL?: string | undefined;
  maxRetries?: number;
}): AiProvider {
  const model = options.model || ANTHROPIC_DEFAULT_MODEL;
  const client = new Anthropic({
    apiKey: options.apiKey,
    ...(options.baseURL ? { baseURL: options.baseURL } : {}),
    maxRetries: options.maxRetries ?? 2,
    timeout: 120_000,
  });
  return {
    id: 'anthropic',
    model,
    async complete(request: AiRequest): Promise<AiResponse> {
      let response: Anthropic.Beta.BetaMessage;
      try {
        response = await client.beta.messages.create({
          model,
          max_tokens: request.maxTokens,
          // On a policy decline, the API re-runs the request on a fallback model it chooses.
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          // Thinking is always on with this model; effort bounds its depth and cost.
          output_config: { effort: 'medium' },
          system: request.system,
          messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
          ...(request.tools?.length
            ? {
                tools: request.tools.map((t) => ({
                  name: t.name,
                  description: t.description,
                  input_schema: t.inputSchema as Anthropic.Beta.BetaTool.InputSchema,
                })),
                // Forced tool choice is not accepted by this model: the prompt asks for tool calls.
                tool_choice: { type: 'auto' },
              }
            : {}),
        });
      } catch (error) {
        throw toAiError(error);
      }
      if (response.stop_reason === 'refusal') {
        throw new AiError('refused', msg('ai.errors.refused'));
      }
      return {
        text: response.content
          .flatMap((b) => (b.type === 'text' ? [b.text] : []))
          .join('\n')
          .trim(),
        toolCalls: response.content.flatMap((b) =>
          b.type === 'tool_use' ? [{ name: b.name, input: b.input }] : [],
        ),
        usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
        model: response.model,
        truncated: response.stop_reason === 'max_tokens',
      };
    },
  };
}

/** SDK errors to stable codes, most specific first (never the raw provider payload). */
function toAiError(error: unknown): AiError {
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError)
    return new AiError('auth', msg('ai.errors.anthropicKey'));
  if (error instanceof Anthropic.RateLimitError) return new AiError('rate-limit', msg('ai.errors.rateLimit'));
  if (error instanceof Anthropic.BadRequestError)
    return new AiError('bad-request', msg('ai.errors.badRequest'));
  if (error instanceof Anthropic.APIConnectionTimeoutError)
    return new AiError('timeout', msg('ai.errors.timeout'));
  if (error instanceof Anthropic.APIConnectionError)
    return new AiError('unavailable', msg('ai.errors.unreachable'));
  if (error instanceof Anthropic.APIError)
    return new AiError('unavailable', msg('ai.errors.unavailable', { status: error.status ?? '?' }));
  return new AiError('invalid-response', msg('ai.errors.invalidResponse'));
}
