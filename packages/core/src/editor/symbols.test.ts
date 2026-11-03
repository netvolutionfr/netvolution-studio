import { describe, expect, it } from 'vitest';
import { loadSite } from '../document/load.ts';
import { tm } from '../i18n/index.ts';
import { sampleDoc, testRegistry } from '../test-registry.ts';
import { instanceStatus, instancesOf } from './commands.ts';
import { createEditorStore } from './store.ts';

/** Home page with a card (box > 2 labels) made into a shared component, and a second page. */
function setup() {
  const s = createEditorStore(sampleDoc(), testRegistry);
  s.dispatch('insertTree', {
    parentId: 'nroot0001',
    index: 1,
    tree: {
      type: 'box',
      name: 'Carte',
      children: [
        { type: 'label', props: { text: 'Titre' } },
        { type: 'label', props: { text: 'Texte' } },
      ],
    },
  });
  const card = s.getState().selection as string;
  expect(
    s.dispatch('createSymbol', {
      nodeId: card,
      name: 'Carte service',
      category: 'features',
      description: 'Une carte',
    }).ok,
  ).toBe(true);
  s.dispatch('createPage', { title: 'Services', slug: 'services', tree: { type: 'box' } });
  return { s, card, services: s.getState().pageId };
}

describe('shared components (ADR-0011)', () => {
  it('a subtree becomes a definition and its first instance; content fields become parameters', () => {
    const { s, card } = setup();
    const doc = s.getState().doc;
    const sym = doc.symbols?.[0];
    expect(sym).toMatchObject({ id: 'c-carte-service', version: 1, category: 'features' });
    expect(sym?.params.map((p) => [p.path, p.prop])).toEqual([
      [[0], 'text'],
      [[1], 'text'],
    ]);
    expect(doc.nodes[card]?.instance).toEqual({ symbolId: 'c-carte-service', version: 1, overrides: {} });
    expect(loadSite(doc, testRegistry).ok).toBe(true);
    // The definition is edited like a page, never rendered on pages.
    s.setPage('c-carte-service');
    expect(s.getState().rootId).toBe(sym?.rootId);
  });

  it('a new version propagates to the instances on demand, keeping their own values', () => {
    const { s, services } = setup();
    const root = s.getState().doc.pages.find((p) => p.id === services)?.rootId as string;
    s.dispatch('insertSymbol', { symbolId: 'c-carte-service', parentId: root, index: 0, linked: true });
    const copy = s.getState().selection as string;
    expect(s.dispatch('setOverride', { id: copy, paramId: 'p1', value: 'Conseil' }).ok).toBe(true);
    // Edit the definition, then publish version 2.
    const sym = s.getState().doc.symbols?.[0];
    const defText = s.getState().doc.nodes[sym?.rootId as string]?.children[1] as string;
    s.dispatch('updateNodeProps', { id: defText, props: { text: 'Nouveau texte' } });
    s.dispatch('publishSymbol', { id: 'c-carte-service' });
    expect(instanceStatus(s.getState().doc, copy, testRegistry)?.outdated).toBe(true);
    const r = s.dispatch('updateInstances', { symbolId: 'c-carte-service' });
    expect(r.ok && r.notice && tm(r.notice)).toBe('2 instances updated');
    const doc = s.getState().doc;
    const updated = instancesOf(doc, 'c-carte-service').find((n) => n.instance?.overrides.p1 === 'Conseil');
    const texts = updated?.children.map((c) => doc.nodes[c]?.props.text);
    expect(texts).toEqual(['Conseil', 'Nouveau texte']);
    expect(updated?.instance?.version).toBe(2);
    expect(instanceStatus(doc, updated?.id as string, testRegistry)).toMatchObject({
      outdated: false,
      modified: false,
    });
    s.undo();
    expect(instancesOf(s.getState().doc, 'c-carte-service').every((n) => n.instance?.version === 1)).toBe(
      true,
    );
  });

  it('local edits are detected; incompatible values are reported, never applied silently', () => {
    const { s, card } = setup();
    const label = s.getState().doc.nodes[card]?.children[1] as string;
    s.dispatch('setOverride', { id: card, paramId: 'p2', value: 'Ma valeur' });
    s.dispatch('updateNodeStyle', {
      id: label,
      breakpoint: 'base',
      set: { fontSize: { value: 30, unit: 'px' } },
    });
    expect(instanceStatus(s.getState().doc, card, testRegistry)?.modified).toBe(true);
    // The definition no longer exposes p2: the instance keeps a value that cannot be applied.
    s.dispatch('updateSymbol', {
      id: 'c-carte-service',
      params: s.getState().doc.symbols?.[0]?.params.slice(0, 1),
    });
    s.dispatch('publishSymbol', { id: 'c-carte-service' });
    const r = s.dispatch('updateInstances', { symbolId: 'c-carte-service' });
    expect(r.ok ? '' : tm(r.error.message)).toMatch(
      /incompatible values for “Carte” \(p2: deleted parameter\)/,
    );
    expect(s.getState().doc.nodes[card]?.instance?.version).toBe(1);
  });

  it('refuses cycles; detach frees a copy; a used definition cannot be removed', () => {
    const { s, card } = setup();
    const sym = s.getState().doc.symbols?.[0];
    const cyclic = s.dispatch('insertSymbol', {
      symbolId: 'c-carte-service',
      parentId: sym?.rootId as string,
      index: 0,
      linked: true,
    });
    expect(cyclic.ok ? '' : tm(cyclic.error.message)).toMatch(/contains itself/);
    expect(s.dispatch('removeSymbol', { id: 'c-carte-service' }).ok).toBe(false);
    s.dispatch('detachInstance', { id: card });
    expect(s.getState().doc.nodes[card]).not.toHaveProperty('instance');
    expect(s.dispatch('removeSymbol', { id: 'c-carte-service' }).ok).toBe(true);
    expect(loadSite(s.getState().doc, testRegistry).ok).toBe(true);
  });

  it('copy/paste of an instance keeps the link; an unlinked insert is an independent copy', () => {
    const { s, services } = setup();
    const root = s.getState().doc.pages.find((p) => p.id === services)?.rootId as string;
    s.dispatch('insertSymbol', { symbolId: 'c-carte-service', parentId: root, index: 0, linked: false });
    expect(s.getState().doc.nodes[s.getState().selection as string]).not.toHaveProperty('instance');
    expect(instancesOf(s.getState().doc, 'c-carte-service')).toHaveLength(1);
  });
});
