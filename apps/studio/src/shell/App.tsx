import { type Rect, t } from '@ns/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Assistant } from './Assistant.tsx';
import { Canvas } from './Canvas.tsx';
import { DesignSystem } from './DesignSystem.tsx';
import type { DragState } from './drag.ts';
import { Inspector } from './Inspector.tsx';
import { Journal } from './Journal.tsx';
import { Library } from './Library.tsx';
import { MediaLibrary } from './MediaLibrary.tsx';
import { Menus } from './Menus.tsx';
import { PagesPanel } from './Pages.tsx';
import { Splitter } from './Splitter.tsx';
import { handleShortcut } from './shortcuts.ts';
import { useStore } from './store.ts';
import { Toolbar } from './Toolbar.tsx';
import { Tree } from './Tree.tsx';
import { VIEWPORTS } from './viewport.ts';

export type SidePanel = 'inspector' | 'design' | 'menus' | 'media' | 'journal' | 'assistant';
const sideTitle = (side: Exclude<SidePanel, 'inspector'>) => t(`app.panels.${side}`);

const PANELS_KEY = 'ns.panels';
const THEME_KEY = 'ns.theme';
function loadPanels(): { left: number; right: number } {
  try {
    const saved = JSON.parse(localStorage.getItem(PANELS_KEY) ?? 'null') as {
      left?: unknown;
      right?: unknown;
    } | null;
    if (typeof saved?.left === 'number' && typeof saved.right === 'number')
      return { left: saved.left, right: saved.right };
  } catch {
    // ignore unreadable preferences
  }
  return { left: 260, right: 320 };
}

const editable = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));

export function App() {
  const store = useStore();
  const [width, setWidth] = useState<number>(VIEWPORTS[0].width);
  const [hover, setHover] = useState<string | null>(null);
  const [rects, setRects] = useState<Record<string, Rect>>({});
  const [drag, setDrag] = useState<DragState | null>(null);
  const rectsRef = useRef(rects);
  rectsRef.current = rects;
  const getRects = useCallback(() => rectsRef.current, []);
  const dragEnv = { rects: getRects, onDrag: setDrag };
  const [panels, setPanels] = useState(loadPanels);
  /** Preview mode (VE-01): the page alone, without panels, overlays or selection. */
  const [preview, setPreview] = useState(false);
  /** Site-wide panels replace the inspector, so their edits stay visible in the canvas. */
  const [side, setSide] = useState<SidePanel>('inspector');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });
  useEffect(() => {
    // Switch instantly: per-component color transitions would fade the whole UI.
    const root = document.documentElement;
    root.classList.add('no-transitions');
    root.dataset.theme = theme;
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('no-transitions')));
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // preference not remembered
    }
  }, [theme]);
  useEffect(() => {
    try {
      localStorage.setItem(PANELS_KEY, JSON.stringify(panels));
    } catch {
      // Private mode or blocked storage: widths are simply not remembered.
    }
  }, [panels]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        (document.activeElement as HTMLElement | null)?.blur(); // commits a field being edited
        handleShortcut(store, { key: 's', mod: true, shift: false });
        return;
      }
      if (editable(e.target)) return;
      // Enter keeps activating the focused button or link; it edits the selection only from the page.
      if (e.key === 'Enter' && e.target !== document.body) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (handleShortcut(store, { key, mod: e.metaKey || e.ctrlKey, shift: e.shiftKey, alt: e.altKey }))
        e.preventDefault();
    };
    addEventListener('keydown', onKey);
    const onLeave = (e: BeforeUnloadEvent) => {
      if (store.getState().dirty) e.preventDefault();
    };
    addEventListener('beforeunload', onLeave);
    return () => {
      removeEventListener('keydown', onKey);
      removeEventListener('beforeunload', onLeave);
    };
  }, [store]);

  return (
    <div
      className="shell"
      style={{
        gridTemplateColumns: preview
          ? '0 0 minmax(0, 1fr) 0 0'
          : `${panels.left}px 6px minmax(0, 1fr) 6px ${panels.right}px`,
      }}
    >
      <Toolbar
        width={width}
        onWidth={setWidth}
        preview={preview}
        onPreview={setPreview}
        side={side}
        onSide={setSide}
        theme={theme}
        onTheme={setTheme}
      />
      <div className="left" hidden={preview}>
        <PagesPanel />
        <Library {...dragEnv} />
        <Tree onHover={setHover} drag={dragEnv} />
      </div>
      {!preview && (
        <Splitter
          label={t('app.leftPanelWidth')}
          value={panels.left}
          min={200}
          max={480}
          direction={1}
          onChange={(left) => setPanels((p) => ({ ...p, left }))}
        />
      )}
      <Canvas
        width={width}
        hover={drag ? null : hover}
        onHover={setHover}
        rects={rects}
        onRects={setRects}
        drop={drag?.target?.marker ?? null}
        preview={preview}
        onDrag={setDrag}
        dragging={drag?.item.nodeId ?? null}
        dragPoint={drag ? { x: drag.x, y: drag.y } : null}
      />
      {!preview && (
        <Splitter
          label={t('app.inspectorWidth')}
          value={panels.right}
          min={240}
          max={560}
          direction={-1}
          onChange={(right) => setPanels((p) => ({ ...p, right }))}
        />
      )}
      {!preview &&
        (side === 'inspector' ? (
          <Inspector width={width} />
        ) : (
          <aside className="panel inspector" aria-label={sideTitle(side)}>
            <h2 className="panel-title">{sideTitle(side)}</h2>
            {side === 'design' ? (
              <DesignSystem />
            ) : side === 'menus' ? (
              <Menus />
            ) : side === 'journal' ? (
              <Journal />
            ) : side === 'assistant' ? (
              <Assistant />
            ) : (
              <MediaLibrary />
            )}
          </aside>
        ))}
      {/* Transparent layer during a drag: the iframe would otherwise swallow pointer moves,
          even with pointer capture on the source (observed in Chromium). */}
      {drag && <div className="drag-layer" />}
      {drag && (
        <div
          className={`drag-ghost${drag.overCanvas && !drag.target ? ' drag-refused' : ''}`}
          style={{ left: drag.x + 12, top: drag.y + 12 }}
          role="status"
        >
          {drag.item.label}
          {drag.overCanvas && !drag.target ? t('app.dropRefused') : ''}
        </div>
      )}
    </div>
  );
}
