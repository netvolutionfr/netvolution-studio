import type { ReactNode } from 'react';

export type StackProps = Record<string, never>;

export default function Stack(p: { className: string; props: StackProps; children?: ReactNode }) {
  return <div className={`ns-stack ${p.className}`}>{p.children}</div>;
}
