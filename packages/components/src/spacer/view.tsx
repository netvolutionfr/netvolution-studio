import type { ReactNode } from 'react';

export type SpacerProps = Record<string, never>;

export default function Spacer(p: { className: string; props: SpacerProps; children?: ReactNode }) {
  return <div aria-hidden="true" className={`ns-spacer ${p.className}`} />;
}
