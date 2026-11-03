import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { registry } from '@ns/components/definitions';
import {
  type AiResponse,
  buildAiRequest,
  createEditorStore,
  loadSite,
  newNodeId,
  proposalFrom,
  type Site,
} from '@ns/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { simulatedProvider } from './simulated.ts';

const ctx = { registry, newId: newNodeId };
let site: Site;
const answer = (toolCalls: AiResponse['toolCalls'], truncated = false): AiResponse => ({
  text: 'ok',
  toolCalls,
  usage: { inputTokens: 1, outputTokens: 1 },
  model: 'test',
  truncated,
});

beforeAll(async () => {
  const raw = JSON.parse(
    await readFile(join(import.meta.dirname, '../../../../templates/atelier-nord.json'), 'utf8'),
  );
  const loaded = loadSite(raw.site ?? raw, registry);
  if (!loaded.ok) throw new Error('modèle invalide');
  site = loaded.doc;
});

const ask = async (instruction: string, selectedId: string | null = null, pageIndex = 0) => {
  const page = site.pages[pageIndex];
  if (!page) throw new Error('page');
  const request = buildAiRequest({
    site,
    pageId: page.id,
    selectedId,
    instruction,
    registry,
    maxTokens: 1000,
  });
  if ('error' in request) throw new Error(request.error);
  return { request, proposal: proposalFrom(site, await simulatedProvider().complete(request), ctx) };
};

describe('AI assistant (CS-08, CS-09, ADR-0014)', () => {
  it('sends the instruction, the selection and the allowed tools only — no other page, no media', async () => {
    const { request } = await ask('Propose un titre.');
    expect(request.tools?.map((t) => t.name).sort()).toEqual(
      [
        'insertTree',
        'moveNode',
        'removeNode',
        'renameNode',
        'setAnimations',
        'updateNodeProps',
        'updateNodeStyle',
        'updatePage',
      ].sort(),
    );
    const content = request.messages[0]?.content ?? '';
    expect(content.startsWith('Propose un titre.')).toBe(true);
    const other = site.pages[1];
    if (other) expect(content).not.toContain(other.rootId);
    expect(content).not.toMatch(/"assets"|\/media\//);
  });

  it('turns editorial and design requests into checked batches (SEO, title, section, tablet)', async () => {
    const seo = await ask('Propose des métadonnées SEO.');
    expect(seo.proposal).toMatchObject({ kind: 'batch' });
    if (seo.proposal.kind === 'batch') expect(seo.proposal.lines.join()).toContain('pages');
    const title = await ask('Propose un titre.');
    expect(title.proposal.kind === 'batch' && title.proposal.diff.changed[0]?.props[0]?.after).toMatch(
      /proposition simulée/,
    );
    const section = await ask('Ajoute une section de témoignages.');
    expect(section.proposal.kind === 'batch' && section.proposal.diff.added.length).toBe(3);
    // The template's grids already have two columns on tablet: a change without effect is only a suggestion.
    const grid = Object.values(site.nodes).find((n) => n.type === 'grid');
    const tablet = await ask('Transforme cette grille en deux colonnes sur tablette.', grid?.id ?? null);
    expect(tablet.proposal).toEqual({ kind: 'text', text: 'Deux colonnes sur tablette.' });
  });

  it('applies an accepted proposal as one undo step from the AI, rejected ones leave no trace', async () => {
    const { proposal } = await ask('Ajoute une section de témoignages.');
    if (proposal.kind !== 'batch') throw new Error(proposal.kind);
    const store = createEditorStore(site, registry);
    const before = store.getState().doc;
    expect(store.applyBatch(proposal.calls, 'Assistant', 'ai').ok).toBe(true);
    expect(store.getState().journal.at(-1)).toMatchObject({ origin: 'ai' });
    store.undo();
    expect(store.getState().doc).toEqual(before);
  });

  it('refuses publication, other commands, invalid or truncated answers, atomically', () => {
    const page = site.pages[0];
    if (!page) throw new Error('page');
    const root = site.nodes[page.rootId];
    const kind = (calls: AiResponse['toolCalls'], truncated = false) =>
      proposalFrom(site, answer(calls, truncated), ctx).kind;
    expect(kind([{ name: 'updatePage', input: { id: page.id, publish: false } }])).toBe('error');
    expect(kind([{ name: 'updatePage', input: { id: page.id, slug: 'ailleurs' } }])).toBe('error');
    expect(kind([{ name: 'removePage', input: { id: page.id } }])).toBe('error');
    expect(kind([{ name: 'updateSite', input: { name: 'x' } }])).toBe('error');
    expect(kind([{ name: 'renameNode', input: { id: root?.id, name: 'x' } }], true)).toBe('error');
    expect(
      kind([
        { name: 'renameNode', input: { id: root?.id, name: 'Valide' } },
        { name: 'updateNodeProps', input: { id: 'nexistepas', props: {} } },
      ]),
    ).toBe('error');
    expect(kind([])).toBe('text');
  });
});
