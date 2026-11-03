import { SCHEMA_VERSION } from './schema.ts';

type Raw = Record<string, unknown>;

/**
 * Pure migrations, keyed by the version they upgrade from. They run on
 * unvalidated input: the result is validated against the current schema
 * afterwards, so a migration only moves fields and never checks them.
 */
const MIGRATIONS: Record<number, (doc: Raw) => Raw> = {
  // ns.page v1 → ns.site v2 (ADR-0007): the page becomes the home page of a one-page site.
  1: (page) => ({
    schemaVersion: 2,
    kind: page.kind === 'ns.page' ? 'ns.site' : page.kind,
    id: page.id,
    name: page.title,
    settings: { lang: 'fr', homePageId: 'home' },
    breakpoints: page.breakpoints,
    pages: [{ id: 'home', title: page.title, slug: '', rootId: page.rootId, publish: true }],
    nodes: page.nodes,
    assets: page.assets,
  }),
};

/** Applies migrations from `doc.schemaVersion` up to the current version. */
export function migrate(doc: Raw): Raw {
  let current = doc;
  for (let v = current.schemaVersion as number; v < SCHEMA_VERSION; v++) {
    const step = MIGRATIONS[v];
    if (!step) throw new Error(`Missing migration from schemaVersion ${v}`);
    current = step(current);
  }
  return current;
}

export const OLDEST_VERSION = Math.min(...Object.keys(MIGRATIONS).map(Number), SCHEMA_VERSION);
