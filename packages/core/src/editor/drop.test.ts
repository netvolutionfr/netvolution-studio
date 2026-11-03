import { describe, expect, it } from 'vitest';
import type { Site } from '../document/schema.ts';
import { sampleDoc, testRegistry } from '../test-registry.ts';
import { computeDropTarget, insertionPoint, isNoopMove } from './drop.ts';
import { createEditorStore } from './store.ts';

/** root (box, column) > [nlabel001, nbox00001 (box, row) > [nlabel002, nlabel003]] */
function layout() {
  const s = createEditorStore(sampleDoc(), testRegistry);
  s.dispatch('insertTree', {
    parentId: 'nroot0001',
    index: 1,
    tree: {
      type: 'box',
      children: [
        { type: 'label', props: { text: 'a' } },
        { type: 'label', props: { text: 'b' } },
      ],
    },
  });
  const doc = s.getState().doc;
  const box = doc.nodes.nroot0001?.children[1] as string;
  const [a, b] = (doc.nodes[box]?.children ?? []) as [string, string];
  const rects = {
    nroot0001: { x: 0, y: 0, width: 400, height: 300 },
    nlabel001: { x: 0, y: 0, width: 400, height: 50 },
    [box]: { x: 0, y: 100, width: 400, height: 100 },
    [a]: { x: 0, y: 100, width: 200, height: 100 },
    [b]: { x: 200, y: 100, width: 200, height: 100 },
  };
  return { doc, rects, box, a, b };
}
const drop = (
  doc: Site,
  rects: Parameters<typeof computeDropTarget>[3],
  x: number,
  y: number,
  nodeId?: string,
) =>
  computeDropTarget(
    doc,
    'nroot0001',
    testRegistry,
    rects,
    { x, y },
    { type: nodeId ? (doc.nodes[nodeId]?.type ?? '') : 'label', nodeId },
  );

describe('computeDropTarget', () => {
  it('inserts before/after the nearest child along a row', () => {
    const { doc, rects, box } = layout();
    expect(drop(doc, rects, 50, 150)).toMatchObject({ parentId: box, index: 0, marker: { x: -1, width: 2 } });
    expect(drop(doc, rects, 150, 150)).toMatchObject({ parentId: box, index: 1 });
    expect(drop(doc, rects, 390, 150)).toMatchObject({ parentId: box, index: 2, marker: { x: 399 } });
  });

  it('uses the vertical axis in a column and falls back to the accepting ancestor', () => {
    const { doc, rects } = layout();
    // Over the first label (a leaf): drop into the root, before or after it.
    expect(drop(doc, rects, 100, 10)).toMatchObject({
      parentId: 'nroot0001',
      index: 0,
      marker: { height: 2 },
    });
    expect(drop(doc, rects, 100, 40)).toMatchObject({ parentId: 'nroot0001', index: 1 });
    // Empty area below the row: after the row.
    expect(drop(doc, rects, 100, 280)).toMatchObject({ parentId: 'nroot0001', index: 2 });
  });

  it('refuses destinations that do not accept the type', () => {
    const { doc, rects } = layout();
    const nothing = { ...testRegistry, canContain: () => false };
    expect(
      computeDropTarget(doc, 'nroot0001', nothing, rects, { x: 50, y: 150 }, { type: 'label' }),
    ).toBeNull();
    expect(
      computeDropTarget(doc, 'nroot0001', nothing, rects, { x: 500, y: 500 }, { type: 'label' }),
    ).toBeNull();
  });

  it('appends to the root below the page content, prepends above it', () => {
    const { doc, rects } = layout();
    expect(drop(doc, rects, 500, 500)).toMatchObject({
      parentId: 'nroot0001',
      index: 2,
      marker: { y: 298, height: 2 },
    });
    expect(drop(doc, rects, 100, -10)).toMatchObject({ parentId: 'nroot0001', index: 0 });
  });

  it('never drops a node into itself or its descendants', () => {
    const { doc, rects, box } = layout();
    expect(drop(doc, rects, 50, 150, box)).toMatchObject({ parentId: 'nroot0001' });
  });

  it('excludes the dragged node from indices and detects no-op moves', () => {
    const { doc, rects, box, a, b } = layout();
    const target = drop(doc, rects, 350, 150, a);
    expect(target).toMatchObject({ parentId: box, index: 1 });
    expect(target && isNoopMove(doc, a, target)).toBe(false);
    const same = drop(doc, rects, 250, 150, b);
    expect(same && isNoopMove(doc, b, same)).toBe(true);
  });

  it('targets an empty container as a whole', () => {
    const s = createEditorStore(sampleDoc(), testRegistry);
    s.dispatch('insertNode', { parentId: 'nroot0001', index: 1, type: 'box' });
    const empty = s.getState().selection as string;
    const rects = {
      nroot0001: { x: 0, y: 0, width: 400, height: 300 },
      [empty]: { x: 0, y: 100, width: 400, height: 80 },
    };
    expect(drop(s.getState().doc, rects, 10, 120)).toEqual({
      parentId: empty,
      index: 0,
      marker: rects[empty],
    });
  });
});

describe('insertionPoint', () => {
  it('inserts into the selected container, after a selected leaf, or at the end of the root', () => {
    const { doc, box, a } = layout();
    expect(insertionPoint(doc, 'nroot0001', testRegistry, box, 'label')).toEqual({ parentId: box, index: 2 });
    expect(insertionPoint(doc, 'nroot0001', testRegistry, a, 'label')).toEqual({ parentId: box, index: 1 });
    expect(insertionPoint(doc, 'nroot0001', testRegistry, null, 'label')).toEqual({
      parentId: 'nroot0001',
      index: 2,
    });
  });
});

describe('insertTree', () => {
  it('builds a subtree from defaults and overrides, with new ids', () => {
    const { doc, box, a } = layout();
    expect(doc.nodes[box]?.children).toHaveLength(2);
    expect(doc.nodes[a]?.props).toEqual({ text: 'a' });
  });

  it('refuses invalid templates without changing the document', () => {
    const s = createEditorStore(sampleDoc(), testRegistry);
    const before = s.getState().doc;
    const nested = { type: 'label', children: [{ type: 'label' }] };
    expect(s.dispatch('insertTree', { parentId: 'nroot0001', index: 0, tree: nested }).ok).toBe(false);
    expect(s.dispatch('insertTree', { parentId: 'nroot0001', index: 0, tree: { type: 'nope' } }).ok).toBe(
      false,
    );
    expect(
      s.dispatch('insertTree', {
        parentId: 'nroot0001',
        index: 0,
        tree: { type: 'label', props: { text: '' } },
      }).ok,
    ).toBe(false);
    expect(s.getState().doc).toBe(before);
  });
});

describe('toTemplate (copy/paste)', () => {
  it('round-trips a subtree through insertTree with new ids', async () => {
    const { toTemplate } = await import('./commands.ts');
    const { doc, box } = layout();
    const tpl = toTemplate(doc, box);
    expect(tpl).toMatchObject({
      type: 'box',
      children: [{ type: 'label', props: { text: 'a' } }, { type: 'label' }],
    });
    const s = createEditorStore(doc, testRegistry);
    expect(
      s.dispatch('insertTree', { parentId: 'nroot0001', index: 0, tree: tpl as NonNullable<typeof tpl> }).ok,
    ).toBe(true);
    const copy = s.getState().selection as string;
    expect(copy).not.toBe(box);
    expect(toTemplate(s.getState().doc, copy)).toEqual(tpl);
  });
});
