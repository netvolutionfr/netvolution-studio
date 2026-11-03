import { registry } from '@ns/components';
import {
  activeBreakpoint,
  type CanvasMessage,
  canvasMessageSchema,
  parentOf,
  type Rect,
  type ShellMessage,
  type Site,
  t,
} from '@ns/core';
import { AlignCenterVertical, AlignEndVertical, AlignStartVertical, StretchHorizontal } from 'lucide-react';
import { type PointerEvent, useEffect, useRef, useState } from 'react';
import { IconButton } from '../ui/index.ts';
import { mediaBase } from './api.ts';
import { getMotion, useMotion } from './motion.ts';
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
}) {
  const store = useStore();
  const doc = useEditor((s) => s.doc);
  const pageId = useEditor((s) => s.pageId);
  const selection = useEditor((s) => s.selection);
  const motion = useMotion();
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [diagnostics, setDiagnostics] = useState<string | null>(null);
  const { onHover, onRects, rects } = props;
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
      else if (m.kind === 'click') {
        if (previewRef.current) return;
        // A click on the shared header/footer opens it for editing (its nodes are not in the page tree).
        const owner = m.nodeId ? rootLayout(store.getState().doc, m.nodeId) : undefined;
        if (owner && owner !== store.getState().pageId) store.setPage(owner);
        store.select(m.nodeId);
      } else onHover(m.nodeId);
    };
    addEventListener('message', onMessage);
    return () => removeEventListener('message', onMessage);
  }, [store, onHover, onRects]);

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
  const resizable = !!parent && !!def?.styleGroups.includes('size');
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

  const box = (id: string | null, kind: 'hover' | 'selected') => {
    const r = id ? rects[id] : undefined;
    if (!id || !r) return null;
    return (
      <div
        className={`overlay overlay-${kind}`}
        style={{ transform: `translate(${r.x}px, ${r.y}px)`, width: r.width, height: r.height }}
      >
        {kind === 'selected' && <span className="overlay-label">{nodeLabel(doc, id)}</span>}
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
          {!props.preview && alignable && selectedBox && !resize && (
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

/** Id of the layout whose tree holds `nodeId`, if any. */
function rootLayout(doc: Site, nodeId: string): string | undefined {
  let id = nodeId;
  for (let parent = parentOf(doc, id); parent; parent = parentOf(doc, id)) id = parent.id;
  return doc.layouts?.find((l) => l.rootId === id)?.id;
}
