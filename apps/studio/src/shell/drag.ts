import { registry } from '@ns/components';
import {
  computeDropTarget,
  type DragSource,
  type DropTarget,
  type EditorStore,
  isNoopMove,
  type NodeTemplate,
  type Rect,
  t,
} from '@ns/core';
import type { PointerEvent } from 'react';

export type DragItem = DragSource & { label: string; tree?: NodeTemplate };
export type DragState = {
  item: DragItem;
  x: number;
  y: number;
  overCanvas: boolean;
  target: DropTarget | null;
};

const THRESHOLD = 4;
// One drag at a time; kept outside React because handlers are recreated on every render.
let session: { start: { x: number; y: number }; state: DragState | null } | null = null;
let suppressClick = false;

/**
 * Pointer-based drag from the shell (library, tree) onto the canvas. The
 * source keeps pointer capture and App shows a transparent layer over the
 * iframe while dragging; the target is computed from the canvas rects.
 */
export function dragHandlers(
  item: DragItem,
  env: { store: EditorStore; rects: () => Record<string, Rect>; onDrag: (d: DragState | null) => void },
) {
  const locate = (e: PointerEvent): DragState => {
    const iframe = document.querySelector<HTMLIFrameElement>('iframe.canvas-iframe');
    const frame = iframe?.getBoundingClientRect();
    // The frame may be scaled for display; rects are in its unscaled coordinates.
    const scale = frame && iframe?.offsetWidth ? frame.width / iframe.offsetWidth : 1;
    const point = frame
      ? { x: (e.clientX - frame.left) / scale, y: (e.clientY - frame.top) / scale }
      : { x: -1, y: -1 };
    const overCanvas =
      !!frame &&
      e.clientX >= frame.left &&
      e.clientX <= frame.right &&
      e.clientY >= frame.top &&
      e.clientY <= frame.bottom;
    const target = overCanvas
      ? computeDropTarget(
          env.store.getState().doc,
          env.store.getState().rootId,
          registry,
          env.rects(),
          point,
          item,
        )
      : null;
    return { item, x: e.clientX, y: e.clientY, overCanvas, target };
  };
  const cancel = () => {
    session = null;
    env.onDrag(null);
    removeEventListener('keydown', onKey);
  };
  const onKey = (e: KeyboardEvent) => e.key === 'Escape' && cancel();

  return {
    onPointerDown(e: PointerEvent) {
      if (e.button !== 0) return;
      session = { start: { x: e.clientX, y: e.clientY }, state: null };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove(e: PointerEvent) {
      if (!session) return;
      if (!session.state && Math.hypot(e.clientX - session.start.x, e.clientY - session.start.y) < THRESHOLD)
        return;
      if (!session.state) addEventListener('keydown', onKey);
      session.state = locate(e);
      env.onDrag(session.state);
    },
    onPointerUp(e: PointerEvent) {
      const done = session?.state ? locate(e) : null;
      cancel();
      if (!done) return;
      suppressClick = true;
      const target = done.target;
      if (!target) return;
      if (item.nodeId) {
        if (!isNoopMove(env.store.getState().doc, item.nodeId, target)) {
          env.store.dispatch(
            'moveNode',
            { id: item.nodeId, parentId: target.parentId, index: target.index },
            t('drag.move'),
          );
        }
      } else {
        env.store.dispatch(
          'insertTree',
          { parentId: target.parentId, index: target.index, tree: item.tree ?? { type: item.type } },
          t('common.add', { label: item.label }),
        );
      }
    },
    onPointerCancel: cancel,
    /** A drag must not also trigger the source's click action. */
    onClickCapture(e: { stopPropagation: () => void; preventDefault: () => void }) {
      if (!suppressClick) return;
      suppressClick = false;
      e.stopPropagation();
      e.preventDefault();
    },
  };
}
