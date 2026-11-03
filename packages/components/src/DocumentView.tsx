import { nodeClassName, pageRoots, type RenderContext, viewProps } from '@ns/core';
import { registry } from './definitions.ts';
import { type View, views } from './views.ts';

function NodeView({ ctx, id }: { ctx: RenderContext; id: string }) {
  const node = ctx.site.nodes[id];
  const Component = node && (views[node.type as keyof typeof views] as View<unknown> | undefined);
  if (!node || !Component) return null;
  return (
    <Component className={nodeClassName(node)} props={viewProps(ctx, node, registry)}>
      {node.children.length ? node.children.map((c) => <NodeView key={c} ctx={ctx} id={c} />) : undefined}
    </Component>
  );
}

/** Canvas renderer of one page. Must produce the same DOM as the exported page (see tests/fidelity). */
export function DocumentView(ctx: RenderContext) {
  return pageRoots(ctx.site, ctx.pageId).map((id) => <NodeView key={id} ctx={ctx} id={id} />);
}
