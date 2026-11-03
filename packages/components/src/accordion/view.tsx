import type { ReactNode } from 'react';

export default function Accordion(p: {
  className: string;
  props: Record<string, never>;
  children?: ReactNode;
}) {
  return <div className={`ns-accordion ${p.className}`}>{p.children}</div>;
}
