import type { ReactNode } from 'react';

export type ContainerProps = { tag: 'section' | 'div' | 'main' | 'header' | 'footer' | 'article' | 'aside' };

export default function Container(p: { className: string; props: ContainerProps; children?: ReactNode }) {
  const Tag = p.props.tag;
  return <Tag className={p.className}>{p.children}</Tag>;
}
