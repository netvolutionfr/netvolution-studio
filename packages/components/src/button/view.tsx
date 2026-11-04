import type { ReactNode } from 'react';

export type ButtonProps = {
  label: string;
  href: string;
  variant: 'primary' | 'secondary' | 'text' | 'plain';
};

export default function Button(p: { className: string; props: ButtonProps; children?: ReactNode }) {
  return (
    <a className={`ns-button ns-button-${p.props.variant} ${p.className}`} href={p.props.href}>
      {p.props.label}
    </a>
  );
}
