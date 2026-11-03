import { z } from 'zod';
import type { Site } from './document/schema.ts';
import { createRegistry } from './registry/registry.ts';

/** Minimal registry for core tests (core must not depend on @ns/components). */
export const testRegistry = createRegistry([
  {
    type: 'box',
    version: 1,
    label: 'Box',
    category: 'layout',
    props: z.strictObject({}),
    defaults: { props: {} },
    children: 'any',
    styleGroups: ['spacing', 'flex', 'visibility'],
    fields: [],
    display: 'flex',
    css: '.ns-box{display:flex}',
    viewName: 'Box',
  },
  {
    type: 'label',
    version: 1,
    label: 'Label',
    category: 'content',
    props: z.strictObject({ text: z.string().min(1) }),
    defaults: { props: { text: 'x' } },
    children: 'none',
    styleGroups: ['typography'],
    fields: [{ kind: 'text', prop: 'text', label: 'Texte' }],
    display: 'block',
    viewName: 'Label',
  },
]);

export const sampleDoc = (): Site => ({
  schemaVersion: 2,
  kind: 'ns.site',
  id: 'sample',
  name: 'Sample',
  settings: { lang: 'fr', homePageId: 'home' },
  breakpoints: [
    { id: 'mobile', label: 'Mobile', maxWidth: 767 },
    { id: 'tablet', label: 'Tablette', maxWidth: 1023 },
  ],
  pages: [{ id: 'home', title: 'Accueil', slug: '', rootId: 'nroot0001', publish: true }],
  nodes: {
    nroot0001: {
      id: 'nroot0001',
      type: 'box',
      props: {},
      style: {
        base: { gap: { value: 32, unit: 'px' }, direction: 'row' },
        tablet: { gap: { value: 16, unit: 'px' } },
        mobile: { direction: 'column' },
      },
      children: ['nlabel001'],
    },
    nlabel001: {
      id: 'nlabel001',
      type: 'label',
      props: { text: 'Hello' },
      style: { base: { fontSize: { value: 20, unit: 'px' } } },
      children: [],
    },
  },
  assets: {},
});

/** Sample document with one value replaced at `path`, typed loosely on purpose (invalid input). */
export function patched(path: string, value: unknown): unknown {
  const doc = sampleDoc() as unknown as Record<string, unknown>;
  const keys = path.split('.');
  const last = keys.pop() as string;
  let target = doc;
  for (const k of keys) target = target[k] as Record<string, unknown>;
  target[last] = value;
  return doc;
}
