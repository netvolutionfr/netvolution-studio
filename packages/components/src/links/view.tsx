import type { ReactNode } from 'react';

export type LinksProps = {
  label: string;
  direction: 'column' | 'row';
  items: { label: string; href: string; current: boolean }[];
};

export default function Links(p: { className: string; props: LinksProps; children?: ReactNode }) {
  return (
    <nav className={`ns-links ns-links-${p.props.direction} ${p.className}`} aria-label={p.props.label}>
      <ul>
        {p.props.items.map((item) => (
          <li key={`${item.href}-${item.label}`}>
            <a href={item.href} aria-current={item.current ? 'page' : undefined}>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
