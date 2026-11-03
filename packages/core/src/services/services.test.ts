import { describe, expect, it } from 'vitest';
import { commands, newNodeId } from '../editor/commands.ts';
import { createEditorStore } from '../editor/store.ts';
import { tm } from '../i18n/index.ts';
import { sampleDoc, testRegistry } from '../test-registry.ts';
import { runBatch, summarize } from './batch.ts';
import { commandCatalog } from './catalog.ts';

const ctx = { registry: testRegistry, newId: newNodeId };
const px = (value: number) => ({ value, unit: 'px' as const });
const calls = [
  { name: 'insertNode', params: { parentId: 'nroot0001', index: 1, type: 'label' } },
  { name: 'updateNodeProps', params: { id: 'nlabel001', props: { text: 'Bonjour' } } },
  { name: 'updateNodeStyle', params: { id: 'nlabel001', breakpoint: 'mobile', set: { fontSize: px(16) } } },
];

describe('command catalog (CS-10, ADR-0013)', () => {
  it('describes every command as an MCP-compatible tool with its contract', () => {
    const catalog = commandCatalog();
    expect(catalog.map((t) => t.name).sort()).toEqual(Object.keys(commands).sort());
    for (const tool of catalog) {
      expect(tool.description.length, tool.name).toBeGreaterThan(10);
      expect(tool.inputSchema).toMatchObject({ type: 'object' });
      expect(['content', 'design', 'structure', 'pages', 'site']).toContain(tool.permission);
      expect(tool.undoable).toBe(true);
    }
    expect(catalog.find((t) => t.name === 'updateNodeProps')?.inputSchema).toMatchObject({
      required: ['id', 'props'],
      additionalProperties: false,
    });
  });
});

describe('batches', () => {
  it('apply on a copy and report an exact diff; the original is untouched', () => {
    const site = sampleDoc();
    const snapshot = JSON.stringify(site);
    const r = runBatch(site, calls, ctx);
    if (!r.ok) throw new Error(tm(r.error.message));
    expect(JSON.stringify(site)).toBe(snapshot);
    expect(r.diff.added).toEqual([{ id: r.results[0]?.created?.[0], type: 'label' }]);
    const label = r.diff.changed.find((c) => c.id === 'nlabel001');
    expect(label?.props).toEqual([{ key: 'text', before: 'Hello', after: 'Bonjour' }]);
    expect(label?.style).toEqual([
      { breakpoint: 'mobile', key: 'fontSize', before: undefined, after: px(16) },
    ]);
    expect(summarize(r.diff).map((m) => tm(m))).toEqual([
      '1 élément ajouté : label',
      'box · children modifié',
      'label · text : « Hello » → « Bonjour »',
      'label · fontSize (mobile) : — → 16px',
    ]);
  });

  it('are atomic: the first invalid call refuses the whole batch', () => {
    const bad = [
      ...calls.slice(0, 2),
      { name: 'updateNodeProps', params: { id: 'nlabel001', props: { text: '' } } },
    ];
    const r = runBatch(sampleDoc(), bad, ctx);
    expect(r.ok ? -1 : r.index).toBe(2);
    expect(r.ok ? '' : tm(r.error.message)).toMatch(/^Opération 3 \(updateNodeProps\)/);
    expect(runBatch(sampleDoc(), [{ name: 'eval', params: {} }], ctx)).toMatchObject({
      ok: false,
      error: { code: 'invalid' },
    });
  });

  it('are refused beyond the caller’s permissions', () => {
    const r = runBatch(sampleDoc(), calls.slice(1), ctx, new Set(['content']));
    expect(r.ok ? '' : tm(r.error.message)).toMatch(
      /Opération 2 \(updateNodeStyle\) : autorisation « design » requise/,
    );
  });

  it('are one undo step in the store, and journaled without content', () => {
    const s = createEditorStore(sampleDoc(), testRegistry);
    const initial = s.getState().doc;
    expect(s.applyBatch(calls, 'Proposition', 'ai').ok).toBe(true);
    expect(s.getState().past).toHaveLength(1);
    const entry = s.getState().journal.at(-1);
    expect(entry).toMatchObject({
      origin: 'ai',
      label: 'Proposition',
      commands: ['insertNode', 'updateNodeProps', 'updateNodeStyle'],
    });
    expect(entry && tm(entry.changes)).toBe('1 ajout(s), 2 modification(s), 0 suppression(s)');
    expect(JSON.stringify(entry)).not.toContain('Bonjour');
    s.undo();
    expect(s.getState().doc).toBe(initial);
    expect(s.applyBatch([{ name: 'removeNode', params: { id: 'nroot0001' } }], 'x').ok).toBe(false);
    expect(s.getState().doc).toBe(initial);
  });
});
