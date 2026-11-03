import { type LibrarySection, registry, sections } from '@ns/components';
import {
  insertionPoint,
  instancesOf,
  type Site,
  SYMBOL_CATEGORIES,
  type SymbolCategory,
  t,
  toTemplate,
} from '@ns/core';
import { Link2, Pencil, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button, IconButton } from '../ui/index.ts';
import { useEditor, useStore } from './store.ts';
import { Thumbnail } from './Thumbnail.tsx';

export const categoryLabel = (category: SymbolCategory) => t(`sections.categories.${category}`);

/** Id of the shared component made from a library section, once linked into the site. */
const librarySymbolId = (section: LibrarySection) => `s-${section.id}`;

/**
 * Section library (CS-01, ADR-0011): the site's shared components, then the built-in sections, with
 * live thumbnails. « Insérer » makes an independent copy; « Insérer liée » a linked instance.
 */
export function SectionLibrary() {
  const store = useStore();
  const doc = useEditor((s) => s.doc);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<SymbolCategory | ''>('');
  // Thumbnails only depend on the design system and media: not recomputed on each edit.
  // biome-ignore lint/correctness/useExhaustiveDependencies: deliberate narrower dependencies.
  const theme = useMemo(() => doc, [doc.tokens, doc.assets, doc.breakpoints, doc.id]);
  const matches = (name: string, description: string, cat: SymbolCategory) =>
    (!category || cat === category) && `${name} ${description}`.toLowerCase().includes(query.toLowerCase());

  const at = (type: string) => {
    const { doc: current, rootId, selection } = store.getState();
    return insertionPoint(current, rootId, registry, selection, type);
  };
  const insertCopy = (section: LibrarySection) => {
    const point = at(section.tree.type);
    if (point)
      store.dispatch(
        'insertTree',
        { ...point, tree: section.tree },
        t('common.add', { label: section.name }),
      );
  };
  const insertLinked = (symbolId: string, type: string, section?: LibrarySection) => {
    const point = at(type);
    if (!point) return;
    store.begin(t('sections.addLinked', { name: section?.name ?? t('sections.aComponent') }));
    if (section && !store.getState().doc.symbols?.some((x) => x.id === symbolId)) {
      store.dispatch('importSymbol', { ...section, id: symbolId });
    }
    store.dispatch('insertSymbol', { symbolId, ...point, linked: true });
    store.commit();
  };

  const own = (doc.symbols ?? []).filter((x) => matches(x.name, x.description, x.category));
  const builtIn = sections.filter((x) => matches(x.name, x.description, x.category));
  return (
    <div className="sections">
      <div className="sections-tools">
        <input
          type="search"
          aria-label={t('sections.search')}
          placeholder={t('sections.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label={t('sections.category')}
          value={category}
          onChange={(e) => setCategory(e.target.value as SymbolCategory | '')}
        >
          <option value="">{t('sections.all')}</option>
          {SYMBOL_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {categoryLabel(value)}
            </option>
          ))}
        </select>
      </div>
      {own.length > 0 && <h3>{t('sections.projectComponents')}</h3>}
      <ul className="sections-list" aria-label={t('sections.projectComponents')}>
        {own.map((sym) => (
          <SectionCard
            key={sym.id}
            site={theme}
            name={sym.name}
            description={t('sections.symbolDescription', {
              category: categoryLabel(sym.category),
              version: sym.version,
              count: instancesOf(doc, sym.id).length,
            })}
            tree={toTemplate(doc, sym.rootId)}
            onCopy={() => {
              const point = at(doc.nodes[sym.rootId]?.type ?? 'stack');
              if (point)
                store.dispatch(
                  'insertSymbol',
                  { symbolId: sym.id, ...point, linked: false },
                  t('common.add', { label: sym.name }),
                );
            }}
            onLinked={() => insertLinked(sym.id, doc.nodes[sym.rootId]?.type ?? 'stack')}
            onEdit={() => store.setPage(sym.id)}
          />
        ))}
      </ul>
      <h3>{t('sections.library')}</h3>
      <ul className="sections-list" aria-label={t('sections.librarySections')}>
        {builtIn.map((section) => (
          <SectionCard
            key={section.id}
            site={theme}
            name={section.name}
            description={section.description}
            tree={section.tree}
            onCopy={() => insertCopy(section)}
            onLinked={() => insertLinked(librarySymbolId(section), section.tree.type, section)}
          />
        ))}
      </ul>
      {own.length + builtIn.length === 0 && <p className="hint">{t('sections.noMatch')}</p>}
    </div>
  );
}

function SectionCard(props: {
  site: Site;
  name: string;
  description: string;
  tree: ReturnType<typeof toTemplate>;
  onCopy: () => void;
  onLinked: () => void;
  onEdit?: () => void;
}) {
  return (
    <li className="section-card" aria-label={props.name}>
      <Thumbnail site={props.site} tree={props.tree} label={props.name} />
      <div className="section-card-body">
        <strong>{props.name}</strong>
        <span className="hint">{props.description}</span>
        <div className="section-card-actions">
          <Button size="sm" icon={Plus} onClick={props.onCopy}>
            {t('sections.insert')}
          </Button>
          <IconButton
            size="sm"
            icon={Link2}
            label={t('sections.insertLinked', { name: props.name })}
            tooltip={t('sections.insertLinkedTip')}
            onClick={props.onLinked}
          />
          {props.onEdit && (
            <IconButton
              size="sm"
              icon={Pencil}
              label={t('sections.editComponent', { name: props.name })}
              onClick={props.onEdit}
            />
          )}
        </div>
      </div>
    </li>
  );
}
