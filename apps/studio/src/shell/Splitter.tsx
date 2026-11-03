import { type PointerEvent, useState } from 'react';

/**
 * Keyboard- and pointer-resizable panel edge (VE-01). While dragging, a
 * full-screen layer receives the pointer, so the canvas iframe cannot swallow it.
 */
export function Splitter(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  /** +1 when dragging right widens the panel, -1 otherwise. */
  direction: 1 | -1;
  onChange: (width: number) => void;
}) {
  const [start, setStart] = useState<{ x: number; value: number } | null>(null);
  const clamp = (v: number) => Math.round(Math.min(props.max, Math.max(props.min, v)));
  const move = (e: PointerEvent) =>
    start && props.onChange(clamp(start.value + (e.clientX - start.x) * props.direction));
  return (
    <>
      {/* biome-ignore lint/a11y/useSemanticElements: an <hr> cannot be a focusable, adjustable separator. */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={props.label}
        aria-valuenow={props.value}
        aria-valuemin={props.min}
        aria-valuemax={props.max}
        tabIndex={0}
        className="splitter"
        onPointerDown={(e) => setStart({ x: e.clientX, value: props.value })}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 64 : 16;
          const delta = { ArrowRight: step, ArrowLeft: -step }[e.key];
          if (delta === undefined) return;
          e.preventDefault();
          props.onChange(clamp(props.value + delta * props.direction));
        }}
      />
      {start && (
        <div className="drag-layer resize-layer" onPointerMove={move} onPointerUp={() => setStart(null)} />
      )}
    </>
  );
}
