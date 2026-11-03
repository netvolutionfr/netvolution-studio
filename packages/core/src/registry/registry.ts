import type { z } from 'zod';
import type { DocNode, Site } from '../document/schema.ts';
import type { ResponsiveStyle, StyleGroup } from '../style/schema.ts';

export type Display = 'block' | 'inline-block' | 'flex' | 'grid';

/** Inspector control for a prop. Style controls are shared and derived from `styleGroups`. */
export type PropField =
  | { kind: 'text' | 'textarea' | 'boolean'; prop: string; label: string }
  /** Rich text: one paragraph, or several with `paragraphs` (Enter starts a new one, ADR-0020). */
  | { kind: 'richText'; prop: string; label: string; paragraphs?: boolean }
  /** An array of rich text lines (list items), edited one by one. */
  | { kind: 'richTextList'; prop: string; label: string }
  /** A link; `optional` allows none (null). */
  | { kind: 'link'; prop: string; label: string; optional?: boolean }
  /** Reference to an entry of `site.assets` of an accepted kind (or null); checked by `loadSite`. */
  | { kind: 'asset'; prop: string; label: string; accept: readonly ('image' | 'svg' | 'file')[] }
  /** A list of media (gallery): items `{ assetId, alt, caption? }` of the accepted kinds; checked by `loadSite`. */
  | { kind: 'assets'; prop: string; label: string; accept: readonly ('image' | 'svg')[] }
  /** Reference to a menu of `site.menus` (or null); checked by `loadSite`. */
  | { kind: 'menu'; prop: string; label: string }
  | { kind: 'number'; prop: string; label: string; min?: number; max?: number; step?: number }
  | {
      kind: 'select';
      prop: string;
      label: string;
      options: readonly { value: string | number; label: string }[];
    };

/**
 * Framework-free component contract. The React view lives in
 * `@ns/components/src/<type>/view.tsx` and is bound by type, so this package
 * never imports React.
 */
export interface ComponentDefinition<P extends Record<string, unknown> = Record<string, unknown>> {
  type: string;
  version: number;
  label: string;
  category: 'layout' | 'content' | 'media';
  props: z.ZodType<P>;
  defaults: { props: P; style?: ResponsiveStyle };
  /** Allowed child types: none, any, or an explicit list. */
  children: 'none' | 'any' | readonly string[];
  styleGroups: readonly StyleGroup[];
  /** Content fields shown in the inspector, in order. */
  fields: readonly PropField[];
  /** Default display, restored when `hidden: false` overrides an inherited `hidden: true`. */
  display: Display;
  /**
   * Interactive behaviour (ADR-0002 addendum): the component ships `island.ts` next to its view, a
   * dependency-free module whose idempotent `init(root)` enhances the server-rendered markup. It is
   * copied into exports and loaded only by the pages using the component.
   */
  island?: boolean;
  /** Static CSS shared by every instance (keyed on `.ns-<type>`). */
  css?: string;
  /**
   * Instance rules depending on props, per breakpoint (`base` or a breakpoint id), emitted in that
   * breakpoint's media query; `selector` is the node's class selector.
   */
  breakpointCss?: (props: Record<string, unknown>, selector: string, breakpoint: string) => string;
  /** Exported component name, also the view file's default export. */
  viewName: string;
  /**
   * Optional pure mapping from document props to view props (e.g. asset id →
   * media URL and dimensions, page link → href). Shared by the canvas and the
   * export, so both render the same markup.
   */
  resolve?: (props: P, ctx: RenderContext, node: DocNode) => Record<string, unknown>;
}

/**
 * What a page render knows: the whole site and the page being rendered.
 * `mediaBase` defaults to MEDIA_PATH; the Studio serves each project's media under its own prefix.
 */
export type RenderContext = {
  site: Site;
  pageId: string;
  mediaBase?: string | undefined;
  /** Prefix of page links (the Studio's site preview); none in exports. */
  basePath?: string | undefined;
};

export { MEDIA_PATH } from '../document/links.ts';

/** Props handed to a node's view. */
export function viewProps(ctx: RenderContext, node: DocNode, registry: Registry): Record<string, unknown> {
  const def = registry.get(node.type);
  return def?.resolve ? def.resolve(node.props, ctx, node) : node.props;
}

/** Media ids placed by a node's fields (single media and media lists), with the kinds each accepts. */
export function fieldAssets(def: ComponentDefinition | undefined, props: Record<string, unknown>) {
  const out: { id: string; prop: string; accept: readonly string[] }[] = [];
  for (const f of def?.fields ?? []) {
    const ref = props[f.prop];
    if (f.kind === 'asset' && typeof ref === 'string') out.push({ id: ref, prop: f.prop, accept: f.accept });
    if (f.kind === 'assets' && Array.isArray(ref))
      for (const item of ref) {
        const id = (item as { assetId?: unknown } | null)?.assetId;
        if (typeof id === 'string') out.push({ id, prop: f.prop, accept: f.accept });
      }
  }
  return out;
}

export interface Registry {
  get(type: string): ComponentDefinition | undefined;
  list(): readonly ComponentDefinition[];
  canContain(parentType: string, childType: string): boolean;
}

export function createRegistry(definitions: readonly ComponentDefinition[]): Registry {
  const byType = new Map<string, ComponentDefinition>();
  for (const def of definitions) {
    if (byType.has(def.type)) throw new Error(`Duplicate component type: ${def.type}`);
    byType.set(def.type, def);
  }
  return {
    get: (type) => byType.get(type),
    list: () => [...byType.values()],
    canContain(parentType, childType) {
      const accepts = byType.get(parentType)?.children;
      if (!accepts || accepts === 'none' || !byType.has(childType)) return false;
      return accepts === 'any' || accepts.includes(childType);
    },
  };
}
