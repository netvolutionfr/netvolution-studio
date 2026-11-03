import { describe, expect, it } from 'vitest';
import { loadSite } from '../document/load.ts';
import { sampleDoc, testRegistry } from '../test-registry.ts';
import { createEditorStore } from './store.ts';

const px = (value: number) => ({ value, unit: 'px' as const });
const setup = () => createEditorStore(sampleDoc(), testRegistry);
const ids = (s: ReturnType<typeof setup>) => Object.keys(s.getState().doc.nodes).sort();

describe('commands', () => {
  it('insert creates a valid node from defaults and selects it', () => {
    const s = setup();
    const r = s.dispatch('insertNode', { parentId: 'nroot0001', index: 0, type: 'label' });
    expect(r.ok).toBe(true);
    const id = s.getState().selection as string;
    expect(s.getState().doc.nodes.nroot0001?.children).toEqual([id, 'nlabel001']);
    expect(s.getState().doc.nodes[id]?.props).toEqual({ text: 'x' });
    expect(loadSite(s.getState().doc, testRegistry).ok).toBe(true);
  });

  it('refuses forbidden destinations without changing the document', () => {
    const s = setup();
    const before = s.getState().doc;
    expect(s.dispatch('insertNode', { parentId: 'nlabel001', index: 0, type: 'box' }).ok).toBe(false);
    expect(s.dispatch('moveNode', { id: 'nroot0001', parentId: 'nlabel001', index: 0 }).ok).toBe(false);
    expect(s.getState().doc).toBe(before);
    expect(s.getState().past).toHaveLength(0);
    expect(s.getState().lastError?.code).toBe('not-allowed');
  });

  it('move keeps ids and refuses cycles', () => {
    const s = setup();
    s.dispatch('insertNode', { parentId: 'nroot0001', index: 1, type: 'box' });
    const box = s.getState().selection as string;
    const before = ids(s);
    expect(s.dispatch('moveNode', { id: 'nlabel001', parentId: box, index: 0 }).ok).toBe(true);
    expect(ids(s)).toEqual(before);
    expect(s.getState().doc.nodes[box]?.children).toEqual(['nlabel001']);
    expect(s.dispatch('moveNode', { id: box, parentId: box, index: 0 }).ok).toBe(false);
    // Reorder within the same parent.
    s.dispatch('insertNode', { parentId: 'nroot0001', index: 0, type: 'label' });
    const first = s.getState().selection as string;
    s.dispatch('moveNode', { id: first, parentId: 'nroot0001', index: 2 });
    expect(s.getState().doc.nodes.nroot0001?.children).toEqual([box, first]);
  });

  it('duplicate copies a subtree with new ids, after the original', () => {
    const s = setup();
    s.dispatch('insertNode', { parentId: 'nroot0001', index: 1, type: 'box' });
    const box = s.getState().selection as string;
    s.dispatch('moveNode', { id: 'nlabel001', parentId: box, index: 0 });
    s.dispatch('duplicateNode', { id: box });
    const copy = s.getState().selection as string;
    const doc = s.getState().doc;
    expect(doc.nodes.nroot0001?.children).toEqual([box, copy]);
    const copiedChild = doc.nodes[copy]?.children[0] as string;
    expect(copiedChild).not.toBe('nlabel001');
    expect(doc.nodes[copiedChild]?.props).toEqual({ text: 'Hello' });
    expect(loadSite(doc, testRegistry).ok).toBe(true);
  });

  it('remove deletes the subtree and clears the selection', () => {
    const s = setup();
    s.select('nlabel001');
    s.dispatch('removeNode', { id: 'nlabel001' });
    expect(ids(s)).toEqual(['nroot0001']);
    expect(s.getState().selection).toBeNull();
    expect(s.dispatch('removeNode', { id: 'nroot0001' }).ok).toBe(false);
  });

  it('rejects invalid props and styles (document never corrupted)', () => {
    const s = setup();
    const before = s.getState().doc;
    expect(s.dispatch('updateNodeProps', { id: 'nlabel001', props: { text: '' } }).ok).toBe(false);
    expect(
      s.dispatch('updateNodeStyle', { id: 'nlabel001', breakpoint: 'base', set: { gap: px(4) } }).ok,
    ).toBe(false);
    expect(
      s.dispatch('updateNodeStyle', { id: 'nlabel001', breakpoint: 'wide', set: { fontSize: px(4) } }).ok,
    ).toBe(false);
    expect(s.getState().doc).toBe(before);
  });

  it('style set/unset per breakpoint, empty breakpoints are dropped', () => {
    const s = setup();
    s.dispatch('updateNodeStyle', { id: 'nlabel001', breakpoint: 'mobile', set: { fontSize: px(14) } });
    expect(s.getState().doc.nodes.nlabel001?.style.mobile).toEqual({ fontSize: px(14) });
    s.dispatch('updateNodeStyle', { id: 'nlabel001', breakpoint: 'mobile', unset: ['fontSize'] });
    expect(s.getState().doc.nodes.nlabel001?.style).toEqual({ base: { fontSize: px(20) } });
  });

  it('rename sets or clears the name', () => {
    const s = setup();
    s.dispatch('renameNode', { id: 'nlabel001', name: '  Accroche ' });
    expect(s.getState().doc.nodes.nlabel001?.name).toBe('Accroche');
    s.dispatch('renameNode', { id: 'nlabel001', name: '' });
    expect(s.getState().doc.nodes.nlabel001).not.toHaveProperty('name');
  });
});

describe('history and transactions', () => {
  it('undo/redo restore exact snapshots; dirty follows the saved document', () => {
    const s = setup();
    const initial = s.getState().doc;
    s.dispatch('updateNodeProps', { id: 'nlabel001', props: { text: 'A' } });
    const a = s.getState().doc;
    expect(s.getState().dirty).toBe(true);
    s.undo();
    expect(s.getState().doc).toBe(initial);
    expect(s.getState().dirty).toBe(false);
    s.redo();
    expect(s.getState().doc).toBe(a);
    s.markSaved();
    expect(s.getState().dirty).toBe(false);
    s.dispatch('updateNodeProps', { id: 'nlabel001', props: { text: 'B' } });
    expect(s.getState().future).toHaveLength(0);
  });

  it('a slider drag is one history entry', () => {
    const s = setup();
    const initial = s.getState().doc;
    s.begin('Taille de police');
    for (let v = 21; v <= 60; v++) {
      s.dispatch('updateNodeStyle', { id: 'nlabel001', breakpoint: 'base', set: { fontSize: px(v) } });
    }
    expect(s.getState().past).toHaveLength(0);
    s.commit();
    expect(s.getState().past).toHaveLength(1);
    expect(s.getState().past[0]?.commands).toHaveLength(40);
    s.undo();
    expect(s.getState().doc).toBe(initial);
  });

  it('cancel restores the document; empty transactions leave no entry', () => {
    const s = setup();
    const initial = s.getState().doc;
    s.begin('x');
    s.dispatch('updateNodeProps', { id: 'nlabel001', props: { text: 'Z' } });
    s.cancel();
    expect(s.getState().doc).toBe(initial);
    s.begin('y');
    s.commit();
    expect(s.getState().past).toHaveLength(0);
  });

  it('undo during a transaction commits it first', () => {
    const s = setup();
    s.begin('x');
    s.dispatch('updateNodeProps', { id: 'nlabel001', props: { text: 'Z' } });
    s.undo();
    expect(s.getState().doc.nodes.nlabel001?.props).toEqual({ text: 'Hello' });
    expect(s.getState().future).toHaveLength(1);
  });

  it('load resets history and selection', () => {
    const s = setup();
    s.dispatch('updateNodeProps', { id: 'nlabel001', props: { text: 'A' } });
    s.select('nlabel001');
    s.load(sampleDoc());
    expect(s.getState()).toMatchObject({ past: [], future: [], selection: null, dirty: false });
  });

  it('notifies subscribers', () => {
    const s = setup();
    let calls = 0;
    const off = s.subscribe(() => calls++);
    s.select('nlabel001');
    off();
    s.select(null);
    expect(calls).toBe(1);
  });
});

describe('pages', () => {
  const box = { type: 'box', children: [{ type: 'label' }] };
  const withAbout = () => {
    const s = setup();
    s.dispatch('createPage', { title: 'À propos', slug: 'a-propos', tree: box });
    return { s, about: s.getState().pageId };
  };

  it('create adds a page with its own root and shows it', () => {
    const { s, about } = withAbout();
    const { doc, rootId } = s.getState();
    expect(about).not.toBe('home');
    expect(doc.pages.map((p) => p.slug)).toEqual(['', 'a-propos']);
    expect(rootId).toBe(doc.pages[1]?.rootId);
    expect(doc.nodes[rootId]?.children).toHaveLength(1);
    expect(loadSite(doc, testRegistry).ok).toBe(true);
    s.undo();
    expect(s.getState().doc.pages).toHaveLength(1);
    expect(s.getState().pageId).toBe('home');
  });

  it('refuses a duplicate or reserved slug', () => {
    const { s, about } = withAbout();
    expect(s.dispatch('createPage', { title: 'Bis', slug: 'a-propos', tree: box }).ok).toBe(false);
    expect(s.dispatch('updatePage', { id: about, slug: 'media' }).ok).toBe(false);
    expect(s.dispatch('updatePage', { id: about, slug: '' }).ok).toBe(false);
    expect(s.dispatch('updatePage', { id: about, slug: 'equipe', title: 'Équipe' }).ok).toBe(true);
    expect(s.getState().doc.pages[1]).toMatchObject({ slug: 'equipe', title: 'Équipe', publish: true });
  });

  it('duplicate copies the content with new ids and a free slug', () => {
    const { s, about } = withAbout();
    s.dispatch('duplicatePage', { id: about });
    s.dispatch('duplicatePage', { id: about });
    const pages = s.getState().doc.pages;
    expect(pages.map((p) => p.slug)).toEqual(['', 'a-propos', 'a-propos-copie-2', 'a-propos-copie']);
    expect(new Set(pages.map((p) => p.rootId)).size).toBe(4);
  });

  it('remove refuses the home page and linked pages, and deletes the subtree', () => {
    const { s, about } = withAbout();
    expect(s.dispatch('removePage', { id: 'home' }).ok).toBe(false);
    const root = s.getState().rootId;
    const before = Object.keys(s.getState().doc.nodes).length;
    expect(s.dispatch('removePage', { id: about }).ok).toBe(true);
    expect(Object.keys(s.getState().doc.nodes)).toHaveLength(before - 2);
    expect(s.getState().doc.nodes[root]).toBeUndefined();
    expect(s.getState().pageId).toBe('home');
  });

  it('set home page swaps slugs; move reorders', () => {
    const { s, about } = withAbout();
    s.dispatch('setHomePage', { id: about });
    const { doc } = s.getState();
    expect(doc.settings.homePageId).toBe(about);
    expect(doc.pages.map((p) => [p.id, p.slug])).toEqual([
      ['home', 'a-propos'],
      [about, ''],
    ]);
    s.dispatch('movePage', { id: about, index: 0 });
    expect(s.getState().doc.pages.map((p) => p.id)).toEqual([about, 'home']);
  });

  it('setPage switches page and clears the selection, outside the history', () => {
    const { s } = withAbout();
    s.select('nlabel001');
    s.setPage('home');
    expect([s.getState().pageId, s.getState().rootId, s.getState().selection]).toEqual([
      'home',
      'nroot0001',
      null,
    ]);
    s.setPage('nope');
    expect(s.getState().pageId).toBe('home');
  });

  it('updateSite sets the name, language and canonical origin; invalid values are refused', () => {
    const s = setup();
    expect(s.dispatch('updateSite', { name: 'Agence', lang: 'en-GB', siteUrl: 'https://agence.fr' }).ok).toBe(
      true,
    );
    expect([s.getState().doc.name, s.getState().doc.settings]).toEqual([
      'Agence',
      { lang: 'en-GB', homePageId: 'home', siteUrl: 'https://agence.fr' },
    ]);
    expect(s.dispatch('updateSite', { lang: 'français' }).ok).toBe(false);
    expect(s.dispatch('updateSite', { siteUrl: 'javascript:alert(1)' }).ok).toBe(false);
    expect(s.dispatch('updateSite', { siteUrl: null }).ok).toBe(true);
    expect(s.getState().doc.settings).not.toHaveProperty('siteUrl');
  });
});
