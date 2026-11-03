import type { ReactNode } from 'react';

export type TabsProps = { label: string; tabs: { id: string; title: string }[] };

/** The tab list is hidden until the island takes over: without JavaScript, panels read in sequence. */
export default function Tabs(p: { className: string; props: TabsProps; children?: ReactNode }) {
  return (
    <div className={`ns-tabs ${p.className}`} data-ns-tabs="">
      <div className="ns-tabs-list" role="tablist" aria-label={p.props.label} hidden>
        {p.props.tabs.map((tab, i) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${tab.id}-tab`}
            aria-controls={tab.id}
            aria-selected={i === 0}
            tabIndex={i === 0 ? 0 : -1}
          >
            {tab.title}
          </button>
        ))}
      </div>
      {p.children}
    </div>
  );
}
