// Simulated provider (ADR-0014): deterministic, no network, no key. Used by the tests and the
// reproducible demonstration; a script decides the answer from the request.
import type { AiProvider, AiRequest, AiResponse } from '@ns/core';

export type Script = (request: AiRequest) => Partial<Pick<AiResponse, 'text' | 'toolCalls'>>;

const tokens = (s: string) => Math.ceil(s.length / 4);

/** Without tools: a short, recognizable answer. */
const echo: Script = (request) => ({
  text: `Proposition simulée : ${request.messages.at(-1)?.content.slice(0, 120) ?? ''}`,
});

type Ctx = {
  page?: { id: string; title: string };
  tree: Node;
  parentId?: string;
  index?: number;
};
type Node = {
  id: string;
  type: string;
  props: Record<string, unknown>;
  style?: Record<string, Record<string, unknown>>;
  children?: Node[];
};
const walk = (n: Node): Node[] => [n, ...(n.children ?? []).flatMap(walk)];

/**
 * The assistant's tasks, scripted from the instruction and the context (CS-08, CS-09): SEO metadata,
 * a testimonials section, a sober variant, two columns on tablet, otherwise a rewrite of the first heading or text.
 */
const assistant: Script = (request) => {
  const content = request.messages.at(-1)?.content ?? '';
  const json = content.match(/```json\n([\s\S]*)\n```/)?.[1];
  if (!json) return echo(request);
  const ctx = JSON.parse(json) as Ctx;
  const ask = (content.split('\n\nContexte')[0] ?? '').toLowerCase();
  const nodes = walk(ctx.tree);
  if (ask.includes('seo') && ctx.page)
    return {
      text: 'Métadonnées proposées pour le référencement.',
      toolCalls: [
        {
          name: 'updatePage',
          input: {
            id: ctx.page.id,
            seo: {
              title: `${ctx.page.title} — proposition simulée`,
              description: `Découvrez ${ctx.page.title.toLowerCase()} : description proposée par l’assistant simulé.`,
            },
          },
        },
      ],
    };
  if (ask.includes('témoignages')) {
    const container = nodes.find((n) => n.type === 'stack' || n.type === 'container') ?? ctx.tree;
    return {
      text: 'Une section de témoignages, ajoutée à la fin.',
      toolCalls: [
        {
          name: 'insertTree',
          input: {
            parentId: container.id,
            index: container.children?.length ?? 0,
            tree: {
              type: 'stack',
              name: 'Témoignages',
              children: [
                { type: 'heading', props: { level: 2, text: 'Ils nous font confiance' } },
                {
                  type: 'text',
                  props: {
                    content: [{ text: '« Un accompagnement précis et attentif. » — Claire, cliente' }],
                  },
                },
              ],
            },
          },
        },
      ],
    };
  }
  if (ask.includes('sobre'))
    return {
      text: 'Variante plus sobre : sans fond coloré, marges verticales réduites.',
      toolCalls: [
        ...nodes
          .filter((n) => n.style?.base?.backgroundColor !== undefined)
          .map((n) => ({
            name: 'updateNodeStyle',
            input: { id: n.id, breakpoint: 'base', unset: ['backgroundColor'] },
          })),
        {
          name: 'updateNodeStyle',
          input: {
            id: ctx.tree.id,
            breakpoint: 'base',
            set: { paddingTop: { value: 48, unit: 'px' }, paddingBottom: { value: 48, unit: 'px' } },
          },
        },
      ],
    };
  const grid = nodes.find((n) => n.type === 'grid');
  if (ask.includes('tablette') && grid)
    return {
      text: 'Deux colonnes sur tablette.',
      toolCalls: [
        { name: 'updateNodeStyle', input: { id: grid.id, breakpoint: 'tablet', set: { columns: 2 } } },
      ],
    };
  const heading = nodes.find((n) => n.type === 'heading' && typeof n.props.text === 'string');
  if (heading)
    return {
      text: 'Un titre plus direct.',
      toolCalls: [
        {
          name: 'updateNodeProps',
          input: { id: heading.id, props: { text: `${heading.props.text} (proposition simulée)` } },
        },
      ],
    };
  return { text: 'Rien à proposer sur cette sélection (assistant simulé).' };
};

/** Default script: the assistant's tasks when the request offers tools, an echo otherwise. */
const defaultScript: Script = (request) => (request.tools?.length ? assistant(request) : echo(request));

export function simulatedProvider(script: Script = defaultScript): AiProvider {
  return {
    id: 'simulated',
    model: 'simulé',
    async complete(request) {
      const answer = script(request);
      const text = answer.text ?? '';
      const input = request.system + request.messages.map((m) => m.content).join('');
      return {
        text,
        toolCalls: answer.toolCalls ?? [],
        usage: {
          inputTokens: tokens(input),
          outputTokens: tokens(text + JSON.stringify(answer.toolCalls ?? [])),
        },
        model: 'simulé',
        truncated: false,
      };
    },
  };
}
