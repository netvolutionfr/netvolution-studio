import { registry } from '@ns/components';
import {
  activeBreakpoint,
  type CanvasMessage,
  canvasDragSource,
  canvasMessageSchema,
  inlineTarget,
  parentOf,
  type Rect,
  type ShellMessage,
  type Site,
  t,
  tm,
} from '@ns/core';
import { AlignCenterVertical, AlignEndVertical, AlignStartVertical, StretchHorizontal } from 'lucide-react';
import { type PointerEvent, useEffect, useRef, useState } from 'react';
import { toParagraphs } from '../rich.ts';
import { IconButton } from '../ui/index.ts';
import { mediaBase } from './api.ts';
import { canvasDrag, type DragState } from './drag.ts';
import { getEditing, setEditing, useEditing } from './editing.ts';
import { getMotion, useMotion } from './motion.ts';
import { FormatToolbar } from './RichFormat.tsx';
import { handleShortcut } from './shortcuts.ts';
import { useEditor, useStore } from './store.ts';
import { nodeLabel } from './Tree.tsx';

export function Canvas(props: {
  width: number;
  hover: string | null;
  onHover: (id: string | null) => void;
  rects: Record<string, Rect>;
  onRects: (r: Record<string, Rect>) => void;
  drop: Rect | null;
  preview: boolean;
  /** Drag state shared with the tree and library (App), and the node being dragged, shown dimmed. */
  onDrag: (d: DragState | null) => void;
  dragging: string | null;
  /** Pointer of the drag in progress (client coordinates), for autoscroll. */
  dragPoint: { x: number; y: number } | null;
}) {
  const store = useStore();
  const doc = useEditor((s) => s.doc);
  const pageId = useEditor((s) => s.pageId);
  const selection = useEditor((s) => s.selection);
  const motion = useMotion();
  const editing = useEditing();
  const [notice, setNotice] = useState<string | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [diagnostics, setDiagnostics] = useState<string | null>(null);
  const { onHover, onRects, rects, onDrag } = props;
  const rectsRef = useRef(rects);
  rectsRef.current = rects;
  const previewRef = useRef(props.preview);
  previewRef.current = props.preview;
  const area = useRef<HTMLElement>(null);
  const [areaSize, setAreaSize] = useState({ width: 1000, height: 800 });
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const observer = new ResizeObserver(() =>
      setAreaSize({ width: el.clientWidth, height: el.clientHeight }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const PAD = 32;
  const scale = Math.min(1, (areaSize.width - PAD) / props.width);
  const frameHeight = Math.max(400, (areaSize.height - PAD - 24) / scale);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const toCanvas = (message: ShellMessage) => frame.current?.contentWindow?.postMessage(message, '*');
    // In-place text editing (ADR-0025): the shell decides what is editable and writes the value.
    const startEdit = (nodeId: string | null) => {
      if (previewRef.current || !nodeId || getEditing()) return;
      const target = inlineTarget(store.getState().doc, nodeId, registry);
      if (!target) return;
      if ('refused' in target) return setNotice(tm(target.refused));
      store.select(nodeId);
      setEditing(nodeId);
      // Keyboard focus in the page (Enter or F2 may come from the shell).
      frame.current?.focus();
      toCanvas({ type: 'edit', nodeId });
    };
    const endEdit = (nodeId: string, value?: unknown) => {
      if (getEditing() !== nodeId) return;
      setEditing(null);
      const state = store.getState();
      const target = value !== undefined ? inlineTarget(state.doc, nodeId, registry) : null;
      const current = state.doc.nodes[nodeId]?.props[target && 'prop' in target ? target.prop : ''];
      if (target && 'prop' in target && canonical(current) !== canonical(value)) {
        const result = target.instance
          ? store.dispatch(
              'setOverride',
              { id: target.instance.id, paramId: target.instance.paramId, value },
              t('canvas.editText'),
            )
          : store.dispatch(
              'updateNodeProps',
              { id: nodeId, props: { [target.prop]: value } },
              t('canvas.editText'),
            );
        if (!result.ok) setNotice(t('richText.invalid'));
      }
      // The canvas rebuilds its DOM from the document, edited or not.
      const after = store.getState();
      toCanvas({
        type: 'render',
        doc: after.doc,
        pageId: after.pageId,
        mediaBase: mediaBase(after.doc.id),
        motion: getMotion(),
      });
    };
    // An element grabbed in the canvas (ED-02): the node it moves, and the gesture in client coordinates.
    let grab: ReturnType<typeof canvasDrag> | null = null;
    const toClient = (m: { x: number; y: number }) => {
      const iframe = frame.current;
      const box = iframe?.getBoundingClientRect();
      const ratio = box && iframe?.offsetWidth ? box.width / iframe.offsetWidth : 1;
      return { clientX: (box?.left ?? 0) + m.x * ratio, clientY: (box?.top ?? 0) + m.y * ratio };
    };
    const onCanvasDrag = (m: Extract<CanvasMessage, { type: 'drag' }>) => {
      if (m.phase === 'start') {
        const state = store.getState();
        const id =
          !previewRef.current && !getEditing() && m.nodeId
            ? canvasDragSource(state.doc, state.rootId, state.selection, m.nodeId)
            : null;
        if (!id) return;
        store.select(id);
        grab = canvasDrag(
          { type: state.doc.nodes[id]?.type ?? '', nodeId: id, label: nodeLabel(state.doc, id) },
          { store, rects: () => rectsRef.current, onDrag },
        );
      }
      if (m.phase === 'move') grab?.move(toClient(m));
      if (m.phase === 'end') grab?.end(toClient(m));
      if (m.phase === 'cancel') grab?.cancel();
      if (m.phase === 'end' || m.phase === 'cancel') grab = null;
    };
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      const parsed = canvasMessageSchema.safeParse(event.data);
      if (!parsed.success) return console.warn('Canvas message ignored', event.data);
      const m: CanvasMessage = parsed.data;
      if (m.type === 'ready') setReady(true);
      else if (m.type === 'rendered') setDiagnostics(null);
      else if (m.type === 'error') setDiagnostics(m.diagnostics.map((d) => d.message).join('; '));
      else if (m.type === 'layout') onRects(m.rects);
      else if (m.type === 'key') handleShortcut(store, m);
      else if (m.type === 'editCommit') endEdit(m.nodeId, m.value);
      else if (m.type === 'editCancel') endEdit(m.nodeId);
      else if (m.type === 'drag') onCanvasDrag(m);
      else if (m.kind === 'dblclick') startEdit(m.nodeId);
      else if (m.kind === 'click') {
        if (previewRef.current) return;
        // A click on the shared header/footer opens it for editing (its nodes are not in the page tree).
        const owner = m.nodeId ? rootLayout(store.getState().doc, m.nodeId) : undefined;
        if (owner && owner !== store.getState().pageId) store.setPage(owner);
        store.select(m.nodeId);
      } else onHover(m.nodeId);
    };
    const onEdit = () => startEdit(store.getState().selection);
    addEventListener('message', onMessage);
    addEventListener('ns:edit', onEdit);
    return () => {
      removeEventListener('message', onMessage);
      removeEventListener('ns:edit', onEdit);
    };
  }, [store, onHover, onRects, onDrag]);

  // A click or focus elsewhere in the Studio ends the edit, except in the formatting toolbar.
  useEffect(() => {
    if (!editing) return;
    const outside = (e: Event) => {
      const target = e.target instanceof Element ? e.target : null;
      if (target === frame.current || target?.closest('.format-tools')) return;
      frame.current?.contentWindow?.postMessage({ type: 'editEnd' } satisfies ShellMessage, '*');
    };
    addEventListener('pointerdown', outside, true);
    addEventListener('focusin', outside, true);
    return () => {
      removeEventListener('pointerdown', outside, true);
      removeEventListener('focusin', outside, true);
    };
  }, [editing]);

  // Autoscroll (ED-02): while dragging near the top or bottom of the visible page, it scrolls,
  // faster closer to the edge. The drop is computed again on release, with the new rects.
  const dragPoint = props.dragPoint;
  useEffect(() => {
    const iframe = frame.current;
    const box = iframe?.getBoundingClientRect();
    const visible = area.current?.getBoundingClientRect();
    if (!dragPoint || !box || !visible || dragPoint.x < box.left || dragPoint.x > box.right) return;
    const top = Math.max(box.top, visible.top);
    const bottom = Math.min(box.bottom, visible.bottom);
    const ZONE = 48;
    const dy =
      dragPoint.y < top + ZONE && dragPoint.y >= top - ZONE
        ? -Math.ceil((top + ZONE - dragPoint.y) / 3)
        : dragPoint.y > bottom - ZONE && dragPoint.y <= bottom + ZONE
          ? Math.ceil((dragPoint.y - bottom + ZONE) / 3)
          : 0;
    if (!dy) return;
    const timer = setInterval(() => {
      const message: ShellMessage = { type: 'scrollBy', dy: Math.max(-40, Math.min(40, dy)) };
      iframe?.contentWindow?.postMessage(message, '*');
    }, 16);
    return () => clearInterval(timer);
  }, [dragPoint]);

  // A page, breakpoint or preview change ends the edit in progress, keeping the text.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs on these changes only.
  useEffect(() => {
    if (getEditing())
      frame.current?.contentWindow?.postMessage({ type: 'editEnd' } satisfies ShellMessage, '*');
  }, [pageId, props.preview, props.width]);

  // ponytail: whole document per change; send patches if large pages make this measurable (R9).
  useEffect(() => {
    if (!ready) return;
    const message: ShellMessage = { type: 'render', doc, pageId, mediaBase: mediaBase(doc.id), motion };
    frame.current?.contentWindow?.postMessage(message, '*');
  }, [doc, pageId, ready, motion]);
  useEffect(() => {
    const onReplay = (e: Event) => {
      const message: ShellMessage = {
        type: 'replay',
        nodeId: (e as CustomEvent<string>).detail,
        reduce: getMotion() === 'reduce',
      };
      frame.current?.contentWindow?.postMessage(message, '*');
    };
    addEventListener('ns:replay', onReplay);
    return () => removeEventListener('ns:replay', onReplay);
  }, []);

  // ---------- Direct manipulation (CS-04): resize handles, snapping guides, alignment in the parent ----------
  const node = selection ? doc.nodes[selection] : undefined;
  const parent = selection ? parentOf(doc, selection) : undefined;
  const def = node && registry.get(node.type);
  const isEditing = !!selection && editing === selection;
  const editTarget = isEditing ? inlineTarget(doc, selection, registry) : null;
  const richEditing =
    !!editTarget && 'field' in editTarget && ['richText', 'richTextList'].includes(editTarget.field.kind);
  const resizable = !!parent && !!def?.styleGroups.includes('size') && !isEditing;
  const alignable =
    !!parent &&
    !!def?.styleGroups.includes('item') &&
    ['flex', 'grid'].includes(registry.get(parent.type)?.display ?? '');
  const [resize, setResize] = useState<{
    edges: 'x' | 'y' | 'xy';
    start: { cx: number; cy: number; w: number; h: number };
    guides: { x?: number; y?: number };
  } | null>(null);
  const SNAP = 6;
  /** Nearest candidate within SNAP screen px, else the value itself. */
  const snap = (value: number, candidates: number[]) => {
    const near = candidates.find((c) => Math.abs(c - value) <= SNAP / scale);
    return near === undefined ? { value } : { value: near, guide: near };
  };
  const startResize = (edges: 'x' | 'y' | 'xy') => (e: PointerEvent<HTMLDivElement>) => {
    const r = selection ? rects[selection] : undefined;
    if (!r) return;
    e.preventDefault();
    store.begin(t('canvas.resize'));
    setResize({ edges, start: { cx: e.clientX, cy: e.clientY, w: r.width, h: r.height }, guides: {} });
  };
  const moveResize = (e: PointerEvent<HTMLDivElement>) => {
    const r = selection ? rects[selection] : undefined;
    const area = parent ? rects[parent.id] : undefined;
    if (!resize || !selection || !r || !area) return;
    const siblings = (parent?.children ?? [])
      .filter((c) => c !== selection)
      .flatMap((c) => (rects[c] ? [rects[c] as Rect] : []));
    const set: Record<string, unknown> = {};
    const guides: { x?: number; y?: number } = {};
    if (resize.edges !== 'y') {
      const right = r.x + resize.start.w + (e.clientX - resize.start.cx) / scale;
      const snapped = snap(right, [area.x + area.width, ...siblings.flatMap((b) => [b.x, b.x + b.width])]);
      if (snapped.guide !== undefined) guides.x = snapped.guide;
      // Never wider than the parent: no horizontal overflow on this breakpoint.
      set.width = { value: Math.round(Math.min(area.width, Math.max(16, snapped.value - r.x))), unit: 'px' };
    }
    if (resize.edges !== 'x') {
      const bottom = r.y + resize.start.h + (e.clientY - resize.start.cy) / scale;
      const snapped = snap(
        bottom,
        siblings.map((b) => b.y + b.height),
      );
      if (snapped.guide !== undefined) guides.y = snapped.guide;
      set.minHeight = { value: Math.round(Math.max(8, snapped.value - r.y)), unit: 'px' };
    }
    store.dispatch(
      'updateNodeStyle',
      { id: selection, breakpoint: activeBreakpoint(doc, props.width), set },
      t('canvas.resize'),
    );
    setResize({ ...resize, guides });
  };

  // A release anywhere (even outside the window) or a lost focus ends the gesture.
  const resizing = resize !== null;
  useEffect(() => {
    if (!resizing) return;
    const end = () => {
      store.commit();
      setResize(null);
    };
    addEventListener('pointerup', end);
    addEventListener('pointercancel', end);
    addEventListener('blur', end);
    return () => {
      removeEventListener('pointerup', end);
      removeEventListener('pointercancel', end);
      removeEventListener('blur', end);
    };
  }, [resizing, store]);
  const align = (value: 'start' | 'center' | 'end' | 'stretch') =>
    selection &&
    store.dispatch(
      'updateNodeStyle',
      { id: selection, breakpoint: activeBreakpoint(doc, props.width), set: { alignSelf: value } },
      t('canvas.align'),
    );

  const box = (id: string | null, kind: 'hover' | 'selected' | 'dragged') => {
    const r = id ? rects[id] : undefined;
    if (!id || !r) return null;
    const label = nodeLabel(doc, id) + (kind === 'selected' && isEditing ? t('canvas.editingLabel') : '');
    return (
      <div
        className={`overlay overlay-${kind}${kind === 'selected' && isEditing ? ' overlay-editing' : ''}`}
        style={{ transform: `translate(${r.x}px, ${r.y}px)`, width: r.width, height: r.height }}
      >
        {kind === 'selected' && <span className="overlay-label">{label}</span>}
        {kind === 'selected' && resizable && (
          <>
            <div className="resize-handle resize-x" onPointerDown={startResize('x')} />
            <div className="resize-handle resize-y" onPointerDown={startResize('y')} />
            <div className="resize-handle resize-xy" onPointerDown={startResize('xy')} />
          </>
        )}
      </div>
    );
  };
  const parentBox = parent ? rects[parent.id] : undefined;
  const selectedBox = selection ? rects[selection] : undefined;

  return (
    <main className="canvas-area" aria-label={t('canvas.label')} ref={area}>
      {diagnostics && <p role="alert">{t('canvas.refused', { message: diagnostics })}</p>}
      <p className="visually-hidden" role="status">
        {isEditing ? t('canvas.editingStatus') : ''}
      </p>
      {notice && (
        <div className="toasts toasts-editor">
          <div className="toast" role="status">
            <span className="toast-text" title={notice}>
              {notice}
            </span>
          </div>
        </div>
      )}
      <p className="zoom">
        {scale < 1 ? t('canvas.zoom', { percent: Math.round(scale * 100) }) : t('canvas.fullSize')}
      </p>
      {/* The frame keeps its real width (true media queries) and is only scaled for display. */}
      <div className="canvas-stage" style={{ width: props.width * scale, height: frameHeight * scale }}>
        <div
          className="canvas-frame"
          style={{
            width: props.width,
            height: frameHeight,
            transform: scale < 1 ? `scale(${scale})` : undefined,
          }}
        >
          {/* allow-same-origin is required by the Vite dev server (R3, see docs/history/reports/tranche-2.md);
            the sandbox still blocks navigation, popups and forms. */}
          <iframe
            ref={frame}
            className="canvas-iframe"
            title={t('canvas.frameTitle')}
            src="./canvas.html"
            sandbox="allow-scripts allow-same-origin"
          />
          <div className="overlays" aria-hidden="true" hidden={props.preview}>
            {props.hover !== selection && box(props.hover, 'hover')}
            {box(props.dragging, 'dragged')}
            {box(selection, 'selected')}
            {resize?.guides.x !== undefined && parentBox && (
              <div
                className="guide guide-x"
                style={{
                  transform: `translate(${resize.guides.x}px, ${parentBox.y}px)`,
                  height: parentBox.height,
                }}
              />
            )}
            {resize?.guides.y !== undefined && parentBox && (
              <div
                className="guide guide-y"
                style={{
                  transform: `translate(${parentBox.x}px, ${resize.guides.y}px)`,
                  width: parentBox.width,
                }}
              />
            )}
            {props.drop && (
              <div
                className="drop-marker"
                style={{
                  transform: `translate(${props.drop.x}px, ${props.drop.y}px)`,
                  width: props.drop.width,
                  height: props.drop.height,
                }}
              />
            )}
          </div>
          {richEditing && selectedBox && (
            // Above the text, or below it near the top of the page.
            <div
              className="canvas-tools format-tools"
              style={
                selectedBox.y > 80
                  ? {
                      transform: `translate(${selectedBox.x}px, ${selectedBox.y - 24}px) translate(0, -100%) scale(${1 / scale})`,
                      transformOrigin: 'bottom left',
                    }
                  : {
                      transform: `translate(${selectedBox.x}px, ${selectedBox.y + selectedBox.height + 8}px) scale(${1 / scale})`,
                      transformOrigin: 'top left',
                    }
              }
            >
              <FormatToolbar
                onFormat={(action) => {
                  // Back to the text first: the canvas restores its selection, then formats it.
                  frame.current?.focus();
                  const message: ShellMessage = { type: 'editFormat', ...action };
                  frame.current?.contentWindow?.postMessage(message, '*');
                }}
              />
            </div>
          )}
          {!props.preview && alignable && selectedBox && !resize && !isEditing && (
            <div
              className="canvas-tools"
              role="toolbar"
              aria-label={t('canvas.align')}
              style={{
                transform: `translate(${selectedBox.x + selectedBox.width}px, ${selectedBox.y}px) translate(-100%, -100%) scale(${1 / scale})`,
                transformOrigin: 'bottom right',
              }}
            >
              {(
                [
                  ['start', t('canvas.alignStart'), AlignStartVertical],
                  ['center', t('canvas.alignCenter'), AlignCenterVertical],
                  ['end', t('canvas.alignEnd'), AlignEndVertical],
                  ['stretch', t('canvas.stretch'), StretchHorizontal],
                ] as const
              ).map(([value, label, icon]) => (
                <IconButton key={value} size="sm" icon={icon} label={label} onClick={() => align(value)} />
              ))}
            </div>
          )}
        </div>
      </div>
      {resize && <div className="drag-layer resize-layer" onPointerMove={moveResize} />}
    </main>
  );
}

/** Rich and plain text in a comparable form (key order and string vs runs do not matter). */
const canonical = (value: unknown) =>
  JSON.stringify(toParagraphs(value as Parameters<typeof toParagraphs>[0]), (_k, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1)))
      : v,
  );

/** Id of the layout whose tree holds `nodeId`, if any. */
function rootLayout(doc: Site, nodeId: string): string | undefined {
  let id = nodeId;
  for (let parent = parentOf(doc, id); parent; parent = parentOf(doc, id)) id = parent.id;
  return doc.layouts?.find((l) => l.rootId === id)?.id;
}
