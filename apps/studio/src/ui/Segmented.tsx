import * as ToggleGroup from '@radix-ui/react-toggle-group';
import type { LucideIcon } from 'lucide-react';

export type SegmentOption = { value: string; label: string; icon?: LucideIcon };

/**
 * Single-choice segmented control (Radix ToggleGroup: roving focus with
 * arrow keys, radio semantics). Icon-only options keep their label as
 * accessible name; their tooltip is the native `title` (a Radix Tooltip on
 * the same element would override the item's `data-state`).
 */
export function Segmented(props: {
  label: string;
  value: string | undefined;
  options: readonly SegmentOption[];
  onChange: (value: string) => void;
  size?: 'sm' | 'md';
  id?: string;
}) {
  return (
    <ToggleGroup.Root
      type="single"
      className={`ui-segmented ui-${props.size ?? 'md'}`}
      aria-label={props.label}
      {...(props.id ? { id: props.id } : {})}
      value={props.value ?? ''}
      onValueChange={(v) => v && props.onChange(v)}
    >
      {props.options.map((o) => {
        const Icon = o.icon;
        return (
          <ToggleGroup.Item
            key={o.value}
            value={o.value}
            aria-label={o.label}
            {...(Icon ? { title: o.label } : {})}
            className="ui-segment"
          >
            {Icon ? <Icon aria-hidden="true" size={15} strokeWidth={1.75} /> : o.label}
          </ToggleGroup.Item>
        );
      })}
    </ToggleGroup.Root>
  );
}
