import { registry } from '@ns/components';
import { parentOf, type Rect, type Site } from '@ns/core';
import { ChevronRight } from 'lucide-react';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { typeIcon } from '../ui/index.ts';
import { type DragState, dragHandlers } from './drag.ts';
import { useEditor, useStore } from './store.ts';

export const nodeLabel = (doc: Site, id: string) => {
  const node = doc.nodes[id];
  return node?.name ?? registry.get(node?.type ?? '')?.label ?? id;
};

type DragEnv = { rects: () => Record<string, Rect>; onDrag: (d: DragState | null) => void };
type Row = { id: string; depth: number; hasChildren: boolean; expanded: boolean };

function visibleRows(doc: Site, rootId: string, collapsed: Set<string>): Row[] {
  const rows: Row[] = [];
  const walk = (id: string, depth: number) => {
    const node = doc.nodes[id];
    if (!node) return;
    const expanded = !collapsed.has(id);
    rows.push({ id, depth, hasChildren: node.children.length > 0, expanded });
    if (expanded) for (const c of node.children) walk(c, depth + 1);
  };
  walk(rootId, 0);
  return rows;
}

/**
 * Layers tree following the ARIA tree pattern (single selection follows
 * focus): ↑/↓ move, → expands or enters, ← collapses or goes to the parent,
 * Home/End jump. Rows are also drag sources (move onto the canvas).
 */
export function Tree({ onHover, drag }: { onHover: (id: string | null) => void; drag: DragEnv }) {
  const store = useStore();
  const doc = useEditor((s) => s.doc);
  const rootId = useEditor((s) => s.rootId);
  const selection = useEditor((s) => s.selection);
  const [collapsed, setCollapsed] = useState(() => new Set<string>());
  const tree = useRef<HTMLDivElement>(null);
  const rows = visibleRows(doc, rootId, collapsed);
  const current = rows.some((r) => r.id === selection) ? selection : rootId;

  useEffect(() => {
    const row = tree.current?.querySelector<HTMLElement>(`[data-id="${current}"]`);
    row?.scrollIntoView({ block: 'nearest' });
    // Move focus only while the user is navigating the tree.
    if (tree.current?.contains(document.activeElement)) row?.focus();
  }, [current]);

  const toggle = (id: string, open?: boolean) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (open ?? next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const onKeyDown = (e: KeyboardEvent, row: Row, index: number) => {
    const go = (r: Row | undefined) => r && store.select(r.id);
    switch (e.key) {
      case 'ArrowDown':
        go(rows[index + 1]);
        break;
      case 'ArrowUp':
        go(rows[index - 1]);
        break;
      case 'Home':
        go(rows[0]);
        break;
      case 'End':
        go(rows.at(-1));
        break;
      case 'ArrowRight':
        if (row.hasChildren && !row.expanded) toggle(row.id, true);
        else if (row.hasChildren) go(rows[index + 1]);
        break;
      case 'ArrowLeft':
        if (row.hasChildren && row.expanded) toggle(row.id, false);
        else go(rows.find((r) => r.id === parentOf(doc, row.id)?.id));
        break;
      case 'Enter':
      case ' ':
        store.select(row.id);
        break;
      default:
        return;
    }
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <nav className="panel" aria-label="Arborescence">
      <h2 className="panel-title" id="tree-title">
        Arborescence
      </h2>
      <div role="tree" aria-labelledby="tree-title" className="tree" ref={tree}>
        {rows.map((row, i) => {
          const node = doc.nodes[row.id];
          if (!node) return null;
          const label = nodeLabel(doc, row.id);
          const Icon = typeIcon(node.type);
          const draggable =
            row.id !== rootId
              ? dragHandlers({ type: node.type, nodeId: row.id, label }, { store, ...drag })
              : {};
          return (
            <div
              key={row.id}
              data-id={row.id}
              role="treeitem"
              aria-level={row.depth + 1}
              aria-selected={row.id === selection}
              aria-expanded={row.hasChildren ? row.expanded : undefined}
              tabIndex={row.id === current ? 0 : -1}
              className="tree-row"
              style={{ paddingInlineStart: `${4 + row.depth * 12}px` }}
              title={node.type}
              onClick={() => store.select(row.id)}
              onKeyDown={(e) => onKeyDown(e, row, i)}
              onMouseEnter={() => onHover(row.id)}
              onMouseLeave={() => onHover(null)}
              {...draggable}
            >
              {row.hasChildren ? (
                <button
                  type="button"
                  tabIndex={-1}
                  className="tree-toggle"
                  aria-label={row.expanded ? `Replier ${label}` : `Déplier ${label}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(row.id);
                  }}
                >
                  <ChevronRight
                    aria-hidden="true"
                    size={12}
                    className={row.expanded ? 'is-open' : undefined}
                  />
                </button>
              ) : (
                <span className="tree-toggle" />
              )}
              <Icon aria-hidden="true" size={14} strokeWidth={1.75} className="tree-icon" />
              <span className="tree-label">{label}</span>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
