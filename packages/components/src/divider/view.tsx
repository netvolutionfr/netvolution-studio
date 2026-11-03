import type { ReactNode } from 'react';

export type DividerProps = Record<string, never>;

export default function Divider(p: { className: string; props: DividerProps; children?: ReactNode }) {
  return <hr className={`ns-divider ${p.className}`} />;
}
