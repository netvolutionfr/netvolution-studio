import { describe, expect, it } from 'vitest';
import { msg } from '../i18n/index.ts';
import { sampleDoc, testRegistry } from '../test-registry.ts';
import { inlineTarget } from './inline.ts';
import { createEditorStore } from './store.ts';

describe('in-place editing target (ADR-0025)', () => {
  it('a text writes its own prop; a node without inline prop is not editable in place', () => {
    const doc = sampleDoc();
    expect(inlineTarget(doc, 'nlabel001', testRegistry)).toMatchObject({ prop: 'text' });
    expect(inlineTarget(doc, 'nroot0001', testRegistry)).toBeNull();
    expect(inlineTarget(doc, 'nmissing1', testRegistry)).toBeNull();
  });

  it('inside an instance: an exposed parameter, else refused', () => {
    const s = createEditorStore(sampleDoc(), testRegistry);
    s.dispatch('insertTree', {
      parentId: 'nroot0001',
      index: 1,
      tree: { type: 'box', children: [{ type: 'label', props: { text: 'A' } }, { type: 'label' }] },
    });
    const card = s.getState().selection as string;
    s.dispatch('createSymbol', { nodeId: card, name: 'Carte', category: 'features', description: '' });
    const [first, second] = s.getState().doc.nodes[card]?.children ?? [];
    // Expose only the first label.
    const sym = s.getState().doc.symbols?.[0];
    s.dispatch('updateSymbol', { id: sym?.id as string, params: sym?.params.slice(0, 1) });
    const doc = s.getState().doc;
    expect(inlineTarget(doc, first as string, testRegistry)).toEqual({
      prop: 'text',
      field: { kind: 'text', prop: 'text', label: 'Texte' },
      instance: { id: card, paramId: sym?.params[0]?.id },
    });
    expect(inlineTarget(doc, second as string, testRegistry)).toEqual({
      refused: msg('canvas.instanceText', { name: 'Carte' }),
    });
  });
});
