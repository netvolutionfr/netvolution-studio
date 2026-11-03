import type { ReactNode } from 'react';

export type AccordionItemProps = { title: string; open: boolean };

export default function AccordionItem(p: {
  className: string;
  props: AccordionItemProps;
  children?: ReactNode;
}) {
  return (
    <details className={`ns-accordion-item ${p.className}`} open={p.props.open}>
      <summary>{p.props.title}</summary>
      <div className="ns-accordion-body">{p.children}</div>
    </details>
  );
}
