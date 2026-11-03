import type { ReactNode } from 'react';

export type GridProps = Record<string, never>;

export default function Grid(p: { className: string; props: GridProps; children?: ReactNode }) {
  return <div className={`ns-grid ${p.className}`}>{p.children}</div>;
}
