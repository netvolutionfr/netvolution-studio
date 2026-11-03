import { createElement, type ReactNode } from 'react';

export type IconProps = { label: string; node: readonly (readonly [string, Record<string, string>])[] };

/** SVG drawn from the registry's icon data (never from document content). */
export default function Icon(p: { className: string; props: IconProps; children?: ReactNode }) {
  const { label, node } = p.props;
  return (
    <svg
      className={`ns-icon ${p.className}`}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {node.map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
}
