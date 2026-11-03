import type { Site } from '../document/schema.ts';
import type { Rect } from '../protocol/messages.ts';
import type { Registry } from '../registry/registry.ts';
import { parentOf } from './commands.ts';

export type DragSource = { type: string; nodeId?: string | undefined };
/** Where a drop lands; `marker` is the insertion line (or the empty container box) to draw. */
export type DropTarget = { parentId: string; index: number; marker: Rect };

const inside = (r: Rect, x: number, y: number) =>
  x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height;
const distance = (r: Rect, x: number, y: number) =>
  Math.hypot(Math.max(r.x - x, 0, x - r.x - r.width), Math.max(r.y - y, 0, y - r.y - r.height));
const LINE = 2;

/**
 * Pure drop-target computation from the rects reported by the canvas (VE-05).
 * The deepest container under the point that accepts the dragged type wins;
 * the index comes from the nearest child, compared horizontally when it has
 * a sibling beside it (rows, grid rows) and vertically otherwise. A node cannot
 * be dropped into itself or its descendants; outside the page content, the
 * drop goes to the start or end of the page root. Returns null when no
 * destination is allowed, before any modification.
 */
export function computeDropTarget(
  doc: Site,
  rootId: string,
  registry: Registry,
  rects: Record<string, Rect>,
  point: { x: number; y: number },
  source: DragSource,
): DropTarget | null {
  const path: string[] = [];
  for (let id: string | undefined = rootId; id && id !== source.nodeId; ) {
    const r = rects[id];
    if (!r || !inside(r, point.x, point.y)) break;
    path.push(id);
    id = doc.nodes[id]?.children.find((c) => {
      const cr = rects[c];
      return cr && inside(cr, point.x, point.y);
    });
  }
  // Outside the page content (e.g. the empty area below it): start or end of the root.
  const root = doc.nodes[rootId];
  const rootRect = rects[rootId];
  if (
    !path.length &&
    root &&
    rootRect &&
    source.nodeId !== rootId &&
    registry.canContain(root.type, source.type)
  ) {
    const top = point.y < rootRect.y;
    const count = root.children.filter((c) => c !== source.nodeId).length;
    const y = top ? rootRect.y : rootRect.y + rootRect.height - LINE;
    return {
      parentId: root.id,
      index: top ? 0 : count,
      marker: { x: rootRect.x, y, width: rootRect.width, height: LINE },
    };
  }
  const parentId = path.reverse().find((id) => {
    const node = doc.nodes[id];
    return node && registry.canContain(node.type, source.type);
  });
  const parent = parentId ? doc.nodes[parentId] : undefined;
  const parentRect = parentId ? rects[parentId] : undefined;
  if (!parentId || !parent || !parentRect) return null;

  const children = parent.children.filter((c) => c !== source.nodeId && rects[c]);
  if (!children.length) return { parentId, index: 0, marker: parentRect };
  const nearest = children.reduce((best, c) =>
    distance(rects[c] as Rect, point.x, point.y) < distance(rects[best] as Rect, point.x, point.y) ? c : best,
  );
  const r = rects[nearest] as Rect;
  // Axis from the actual layout: a sibling beside the nearest child means a row.
  const beside = (o: Rect) =>
    o.y < r.y + r.height && r.y < o.y + o.height && (o.x >= r.x + r.width - 1 || r.x >= o.x + o.width - 1);
  const alongRow =
    children.some((c) => c !== nearest && beside(rects[c] as Rect)) ||
    (children.length === 1 && point.y >= r.y && point.y <= r.y + r.height && !inside(r, point.x, point.y));
  const before = alongRow ? point.x < r.x + r.width / 2 : point.y < r.y + r.height / 2;
  const marker = alongRow
    ? { x: (before ? r.x : r.x + r.width) - LINE / 2, y: r.y, width: LINE, height: r.height }
    : { x: r.x, y: (before ? r.y : r.y + r.height) - LINE / 2, width: r.width, height: LINE };
  return { parentId, index: children.indexOf(nearest) + (before ? 0 : 1), marker };
}

/** True when dropping `nodeId` at `target` would not change the document. */
export function isNoopMove(doc: Site, nodeId: string, target: DropTarget) {
  const parent = parentOf(doc, nodeId);
  return parent?.id === target.parentId && parent.children.indexOf(nodeId) === target.index;
}

/** Click-to-insert position: inside the selection, after it, or at the end of the root. */
export function insertionPoint(
  doc: Site,
  rootId: string,
  registry: Registry,
  selection: string | null,
  type: string,
) {
  const selected = selection ? doc.nodes[selection] : undefined;
  if (selected && registry.canContain(selected.type, type)) {
    return { parentId: selected.id, index: selected.children.length };
  }
  const parent = selection ? parentOf(doc, selection) : undefined;
  if (selection && parent && registry.canContain(parent.type, type)) {
    return { parentId: parent.id, index: parent.children.indexOf(selection) + 1 };
  }
  const root = doc.nodes[rootId];
  return root && registry.canContain(root.type, type)
    ? { parentId: root.id, index: root.children.length }
    : null;
}
