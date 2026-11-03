// Presentational components shared verbatim by the canvas (client render)
// and the Astro export (static server render). No editor imports here.
import type { ReactNode } from 'react';

type N = { id: string; type: string; props: Record<string, any>; children?: N[] };
type C = (p: { className: string; props: Record<string, any>; children?: ReactNode }) => ReactNode;

const components: Record<string, C> = {
  container: ({ className, children }) => <main className={className}>{children}</main>,
  stack: ({ className, children }) => <div className={`ns-stack ${className}`}>{children}</div>,
  grid: ({ className, children }) => <div className={`ns-grid ${className}`}>{children}</div>,
  heading: ({ className, props }) => {
    const Tag = `h${props.level}` as 'h1';
    return <Tag className={className}>{props.text}</Tag>;
  },
  text: ({ className, props }) => <p className={className}>{props.text}</p>,
  image: ({ className, props }) => (
    <img className={className} src={props.src} alt={props.alt} width={props.width} height={props.height} />
  ),
  button: ({ className, props }) => <a className={className} href={props.href}>{props.label}</a>,
};

function Node({ node }: { node: N }) {
  const Comp = components[node.type];
  return (
    <Comp className={`ns-${node.id}`} props={node.props}>
      {node.children?.map((c) => <Node key={c.id} node={c} />)}
    </Comp>
  );
}

export function Page({ doc }: { doc: { root: N } }) {
  return <div data-ns-root=""><Node node={doc.root} /></div>;
}
