# ADR-0014 — AI providers and confidentiality

**Status:** Accepted on 10/30/2026 · **Date:** 10/30/2026 · **Ref.:** CS-08, CS-09, CS-11, CLAUDE §8, ADR-0013; milestone 3 study §10.3

## Context

AI assistance (slice 7) must propose transformations as **command batches** (ADR-0013), always previewed and approved by the user. Several constraints apply:
- the provider must not be imposed;
- keys stay on the server (CS-11);
- costs must be bounded;
- the content sent must be explicit;
- tests and the demonstration must depend neither on a network nor on a key.

## Decision

1. **Neutral contract** (`core/src/ai/contract.ts`): `AiProvider.complete({ system, messages, tools?, maxTokens })` returns `{ text, toolCalls, usage, model, truncated }`, or throws a typed `AiError`:
   - `disabled`, `too-large`, `rate-limit`, `budget`, `auth`, `refused`;
   - `timeout`, `unavailable`, `bad-request`, `invalid-response`.

   Tools are described by their JSON Schema, that of the command catalog. The request is validated by `aiRequestSchema`, with sizes bounded by `AI_LIMITS`.
2. **Three providers**, chosen by `NS_AI_PROVIDER`:
   - `anthropic`: official SDK `@anthropic-ai/sdk` (pinned version), default model `claude-opus-5-5`.
     - Tool choice left to the model (`tool_choice: auto`) and `medium` effort.
     - **Server-side fallback enabled by default** (`fallbacks: "default"`): if the main model refuses, the API replays the request on a fallback model. A persistent refusal becomes the `refused` error.
   - `openai`: a `fetch` adapter to `/chat/completions`, for OpenAI, Mistral, Ollama, LM Studio… `NS_AI_BASE_URL` and `NS_AI_MODEL` are configurable, the key optional for a local model.
   - `simulated`: deterministic, without a network, for the tests, the bench and the demonstration.
3. **Server service** (`dev-server/ai/service.ts`), the only calling point, which:
   - reads the configuration and keys from the environment (unversioned `.env`, template `.env.example`);
   - **caps** the tokens per answer (`NS_AI_MAX_TOKENS`), the requests per minute (`NS_AI_REQUESTS_PER_MINUTE`) and the daily budget (`NS_AI_DAILY_TOKENS`);
   - records each call in `data/ai-log.jsonl`: provider, model, duration, tokens, number of tool calls, status or error code, **never any content**.
4. **Routes**:
   - `GET /api/ai/status`: state, provider, model, limits and the day's consumption, **without any key**;
   - `POST /api/ai/complete`. Errors: disabled → 503, quota → 429, refusal → 422, timeout → 504, otherwise 502.

   The browser has neither a key nor direct access to the provider.
5. **Without configuration, the assistant is disabled.** The Studio stays fully usable; the "AI assistant" panel explains how to enable it.

## Confidentiality: what is sent

- **Nothing without an explicit action**: no background call, no automatic analysis of the site.
- **Only what the request needs** (slice 7): the user's instruction, the description of the allowed tools and the relevant extract of the site (the selected element or page), not the whole project nor the media library. Media files are never sent.
- **Third-party provider**: data is processed under the terms of the chosen provider. A local endpoint (Ollama, LM Studio) keeps everything on the machine.
- **Local log without content** (see above); exports contain no key or AI configuration (checked by a test).

## Alternatives

- **Calling directly from the browser**: it would expose the keys (CS-11).
- **A single provider**: lock-in and no local model possible.
- **A multi-provider abstraction library**: a heavy dependency for two adapters of a few dozen lines.
- **Raw `fetch` for Anthropic**: the official SDK handles headers, retries, typed errors and API changes.

## Consequences

- One new server dependency (`@anthropic-ai/sdk`), absent from the Studio bundle and from exports.
- Limits are global to the server, without accounts (out of scope). The daily counter lives in memory and resets on restart.
- The server stays local and without authentication (CLAUDE §8): an Internet deployment requires external access protection, all the more as the assistant incurs costs.
