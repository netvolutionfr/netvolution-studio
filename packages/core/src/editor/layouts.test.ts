import { describe, expect, it } from 'vitest';
import { loadSite } from '../document/load.ts';
import { pageRoots } from '../style/css.ts';
import { sampleDoc, testRegistry } from '../test-registry.ts';
import { createEditorStore } from './store.ts';

const setup = () => {
  const s = createEditorStore(sampleDoc(), testRegistry);
  s.dispatch('createPage', { title: 'Contact', slug: 'contact', tree: { type: 'box' } });
  const contact = s.getState().pageId;
  s.setPage('home');
  return { s, contact };
};

describe('layouts (SB-04)', () => {
  it('a header and a footer are shared by every page, in order, and editable on their own', () => {
    const { s, contact } = setup();
    s.dispatch('createLayout', {
      role: 'header',
      name: 'Header',
      tree: { type: 'box', children: [{ type: 'label' }] },
    });
    expect(s.getState().pageId).toBe('header'); // editing the new layout
    const header = s.getState().rootId;
    s.dispatch('createLayout', { role: 'footer', name: 'Footer', tree: { type: 'box' } });
    const footer = s.getState().rootId;
    const doc = s.getState().doc;
    expect(loadSite(doc, testRegistry).ok).toBe(true);
    expect(doc.settings.defaultLayouts).toEqual({ header: 'header', footer: 'footer' });
    expect(pageRoots(doc, 'home')).toEqual([header, 'nroot0001', footer]);
    expect(pageRoots(doc, contact)).toEqual([header, doc.pages[1]?.rootId, footer]);
    expect(pageRoots(doc, 'header')).toEqual([header]);
  });

  it('a page can hide them; removing a layout removes its nodes and the choices', () => {
    const { s, contact } = setup();
    s.dispatch('createLayout', { role: 'header', name: 'Header', tree: { type: 'box' } });
    const header = s.getState().rootId;
    s.dispatch('setPageLayout', { id: contact, role: 'header', show: false });
    expect(pageRoots(s.getState().doc, contact)).toHaveLength(1);
    s.dispatch('setPageLayout', { id: contact, role: 'header', show: true });
    expect(s.getState().doc.pages[1]).not.toHaveProperty('layouts');
    s.dispatch('setPageLayout', { id: contact, role: 'header', show: false });
    s.dispatch('removeLayout', { id: 'header' });
    const doc = s.getState().doc;
    expect(doc.nodes[header]).toBeUndefined();
    // The page keeps its explicit « no header ».
    expect([doc.layouts, doc.settings.defaultLayouts, doc.pages[1]?.layouts]).toEqual([
      [],
      {},
      { header: null },
    ]);
    expect(s.getState().pageId).toBe('home');
  });

  it('refuses choices naming a missing layout or one of the other role', () => {
    const d = sampleDoc();
    d.settings.defaultLayouts = { header: 'nope' };
    const r = loadSite(d, testRegistry);
    expect(r.ok ? [] : r.diagnostics.map((x) => x.code)).toEqual(['missing-layout']);
  });
});

describe('menus (SB-03)', () => {
  it('menus reference pages; a page in a menu cannot be removed', () => {
    const { s, contact } = setup();
    const home = { id: 'e1', label: 'Accueil', link: { kind: 'page' as const, pageId: 'home' } };
    const menu = {
      id: 'main',
      name: 'Principal',
      items: [
        home,
        {
          id: 'e2',
          label: 'Plus',
          link: { kind: 'url' as const, href: 'https://example.com' },
          children: [{ id: 'e3', label: 'Contact', link: { kind: 'page' as const, pageId: contact } }],
        },
      ],
    };
    expect(s.dispatch('setMenu', { menu }).ok).toBe(true);
    expect(s.dispatch('removePage', { id: contact }).ok).toBe(false);
    expect(s.dispatch('setMenu', { menu: { ...menu, items: [...menu.items, home] } }).ok).toBe(false); // duplicate entry ids
    const deep = { ...menu, items: [{ ...home, id: 'e2', children: [{ ...home, children: [] }] }] };
    expect(s.dispatch('setMenu', { menu: deep as never }).ok).toBe(false); // one sub-level only
    expect(s.dispatch('removeMenu', { id: 'main' }).ok).toBe(true);
  });
});
