import { DocumentView, registry } from '@ns/components';
import { buildTree, type NodeTemplate, newNodeId, type Site, t, toCss } from '@ns/core';
import { useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { mediaBase } from './api.ts';

const WIDTH = 1200;
const THUMB_PAGE = 'ns-thumbnail';

/**
 * Live thumbnail of a section or shared component (ADR-0011): the real views and CSS of the site
 * (tokens included), rendered in a shadow root, isolated from the Studio styles, scaled down.
 * Nothing is stored; `key` should change only when the rendering inputs change.
 */
export function Thumbnail(props: { site: Site; tree: NodeTemplate | null; label: string; width?: number }) {
  const host = useRef<HTMLDivElement>(null);
  const width = props.width ?? 220;
  const scale = width / WIDTH;
  const { site, tree } = props;
  const rendering = useMemo(() => {
    if (!tree) return null;
    const built = buildTree({ ...site, nodes: {} }, tree, { registry, newId: newNodeId });
    if (!built) return null;
    const preview: Site = {
      ...built.doc,
      pages: [
        {
          id: THUMB_PAGE,
          title: '',
          slug: 'thumbnail',
          rootId: built.id,
          publish: true,
          layouts: { header: null, footer: null },
        },
      ],
      layouts: [],
    };
    // Base rules target `body`: in the shadow root they apply to the mount element instead.
    return {
      preview,
      css: toCss(preview, registry, [built.id], null).replaceAll('body{', '.ns-thumb-body{'),
    };
  }, [site, tree]);

  useEffect(() => {
    const el = host.current;
    if (!el || !rendering) return;
    const shadow = el.shadowRoot ?? el.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = rendering.css;
    const mount = document.createElement('div');
    mount.className = 'ns-thumb-body';
    Object.assign(mount.style, {
      width: `${WIDTH}px`,
      padding: '24px',
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
      background: '#fff',
      pointerEvents: 'none',
    });
    shadow.replaceChildren(style, mount);
    const root = createRoot(mount);
    root.render(<DocumentView site={rendering.preview} pageId={THUMB_PAGE} mediaBase={mediaBase(site.id)} />);
    // Deferred: unmounting synchronously while the parent renders is not allowed.
    return () => {
      setTimeout(() => root.unmount());
    };
  }, [rendering, scale, site.id]);

  return (
    <div
      ref={host}
      className="thumbnail"
      role="img"
      aria-label={t('thumbnail.label', { label: props.label })}
      style={{ width }}
    />
  );
}
