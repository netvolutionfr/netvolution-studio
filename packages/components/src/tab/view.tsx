import type { ReactNode } from 'react';

export type TabProps = { title: string; id: string };

export default function Tab(p: { className: string; props: TabProps; children?: ReactNode }) {
  return (
    <section className={`ns-tab ${p.className}`} id={p.props.id}>
      <h3 className="ns-tab-title">{p.props.title}</h3>
      {p.children}
    </section>
  );
}
