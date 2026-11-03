import { registry, sections } from '@ns/components';
import { insertionPoint, type Rect } from '@ns/core';
import { LayoutTemplate, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { PRESET_ICONS, Segmented, Tip, typeIcon } from '../ui/index.ts';
import { type DragItem, type DragState, dragHandlers } from './drag.ts';
import { SectionLibrary } from './SectionLibrary.tsx';
import { useStore } from './store.ts';

const TAB_KEY = 'ns.library-tab';
const CATEGORIES = { layout: 'Structure', content: 'Contenu', media: 'Médias' } as const;

export function Library(props: { rects: () => Record<string, Rect>; onDrag: (d: DragState | null) => void }) {
  const [tab, setTab] = useState<'components' | 'sections'>(() => {
    try {
      return localStorage.getItem(TAB_KEY) === 'sections' ? 'sections' : 'components';
    } catch {
      return 'components';
    }
  });
  const choose = (next: 'components' | 'sections') => {
    setTab(next);
    try {
      localStorage.setItem(TAB_KEY, next);
    } catch {
      // not remembered
    }
  };
  const store = useStore();
  const insert = (item: DragItem) => {
    const { doc, rootId, selection } = store.getState();
    const at = insertionPoint(doc, rootId, registry, selection, item.type);
    if (!at) return;
    store.dispatch('insertTree', { ...at, tree: item.tree ?? { type: item.type } }, `Ajouter ${item.label}`);
  };
  const button = (item: DragItem, key: string, Icon: LucideIcon) => (
    <li key={key}>
      <Tip content="Cliquer pour insérer après la sélection, ou glisser dans le canvas" side="right">
        <button
          type="button"
          className="library-item"
          onClick={() => insert(item)}
          {...dragHandlers(item, { store, rects: props.rects, onDrag: props.onDrag })}
        >
          <Icon aria-hidden="true" size={18} strokeWidth={1.5} />
          <span>{item.label}</span>
        </button>
      </Tip>
    </li>
  );
  const defs = registry.list();
  return (
    <section className="panel library" aria-label="Bibliothèque">
      <div className="panel-title-row">
        <h2 className="panel-title">Ajouter</h2>
        <Segmented
          size="sm"
          label="Contenu de la bibliothèque"
          value={tab}
          options={[
            { value: 'components', label: 'Composants' },
            { value: 'sections', label: 'Sections' },
          ]}
          onChange={(v) => choose(v as 'components' | 'sections')}
        />
      </div>
      {tab === 'sections' ? (
        <SectionLibrary />
      ) : (
        <>
          {Object.entries(CATEGORIES).map(([category, title]) => {
            const items = defs.filter((d) => d.category === category);
            return (
              items.length > 0 && (
                <div key={category}>
                  <h3>{title}</h3>
                  <ul className="library-list">
                    {items.map((d) => button({ type: d.type, label: d.label }, d.type, typeIcon(d.type)))}
                  </ul>
                </div>
              )
            );
          })}
          <h3>Compositions</h3>
          <ul className="library-list">
            {sections.map((p) =>
              button(
                { type: p.tree.type, label: p.name, tree: p.tree },
                p.id,
                PRESET_ICONS[p.id] ?? LayoutTemplate,
              ),
            )}
          </ul>
        </>
      )}
    </section>
  );
}
