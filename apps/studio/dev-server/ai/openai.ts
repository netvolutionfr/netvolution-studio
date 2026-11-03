// OpenAI-compatible provider (ADR-0014): « chat completions » with function tools, over plain HTTP.
// Covers OpenAI and compatible endpoints (Mistral, Ollama, LM Studio…) through NS_AI_BASE_URL.
import { AiError, type AiProvider, type AiRequest, type AiResponse, msg } from '@ns/core';

type Completion = {
  model?: string;
  choices?: {
    finish_reason?: string;
    message?: {
      content?: string | null;
      tool_calls?: { function?: { name?: string; arguments?: string } }[];
    };
  }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

export function openAiProvider(options: {
  baseUrl: string;
  model: string;
  apiKey?: string | undefined;
}): AiProvider {
  const url = `${options.baseUrl.replace(/\/$/, '')}/chat/completions`;
  return {
    id: 'openai',
    model: options.model,
    async complete(request: AiRequest): Promise<AiResponse> {
      let res: Response;
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(options.apiKey ? { authorization: `Bearer ${options.apiKey}` } : {}),
          },
          body: JSON.stringify({
            model: options.model,
            max_tokens: request.maxTokens,
            messages: [{ role: 'system', content: request.system }, ...request.messages],
            ...(request.tools?.length
              ? {
                  tools: request.tools.map((t) => ({
                    type: 'function',
                    function: { name: t.name, description: t.description, parameters: t.inputSchema },
                  })),
                  tool_choice: 'auto',
                }
              : {}),
          }),
          signal: AbortSignal.timeout(120_000),
        });
      } catch (error) {
        throw (error as Error).name === 'TimeoutError'
          ? new AiError('timeout', msg('ai.errors.timeout'))
          : new AiError('unavailable', msg('ai.errors.unreachable'));
      }
      if (res.status === 401 || res.status === 403) throw new AiError('auth', msg('ai.errors.openAiKey'));
      if (res.status === 429) throw new AiError('rate-limit', msg('ai.errors.rateLimit'));
      if (res.status === 400 || res.status === 422)
        throw new AiError('bad-request', msg('ai.errors.badRequest'));
      if (!res.ok) throw new AiError('unavailable', msg('ai.errors.unavailable', { status: res.status }));
      const body = (await res.json().catch(() => null)) as Completion | null;
      const choice = body?.choices?.[0];
      if (!choice?.message) throw new AiError('invalid-response', msg('ai.errors.invalidResponse'));
      const toolCalls = (choice.message.tool_calls ?? []).map((call) => {
        try {
          return {
            name: call.function?.name ?? '',
            input: JSON.parse(call.function?.arguments || '{}') as unknown,
          };
        } catch {
          throw new AiError('invalid-response', msg('ai.errors.toolCall'));
        }
      });
      return {
        text: (choice.message.content ?? '').trim(),
        toolCalls,
        usage: {
          inputTokens: body?.usage?.prompt_tokens ?? 0,
          outputTokens: body?.usage?.completion_tokens ?? 0,
        },
        model: body?.model ?? options.model,
        truncated: choice.finish_reason === 'length',
      };
    },
  };
}
