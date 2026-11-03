import type { ReactNode } from 'react';

export type NavItem = { label: string; href: string; current: boolean; active: boolean; children: NavItem[] };
export type NavProps = { label: string; toggle: string; items: NavItem[] };

function List(p: { items: NavItem[] }) {
  return (
    <ul className="ns-nav-list">
      {p.items.map((item) => (
        <li key={`${item.href}-${item.label}`} className={item.active ? 'ns-nav-active' : undefined}>
          <a href={item.href} aria-current={item.current ? 'page' : undefined}>
            {item.label}
          </a>
          {item.children.length > 0 && <List items={item.children} />}
        </li>
      ))}
    </ul>
  );
}

/** The bar and the folded menu hold the same list; CSS shows one of them per breakpoint (no JS). */
export default function Nav(p: { className: string; props: NavProps; children?: ReactNode }) {
  return (
    <nav className={`ns-nav ${p.className}`} aria-label={p.props.label}>
      <div className="ns-nav-bar">
        <List items={p.props.items} />
      </div>
      <details className="ns-nav-menu">
        <summary>{p.props.toggle}</summary>
        <List items={p.props.items} />
      </details>
    </nav>
  );
}
