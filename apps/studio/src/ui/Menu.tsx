import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Tooltip from '@radix-ui/react-tooltip';
import type { LucideIcon } from 'lucide-react';

export type MenuItem =
  | { label: string; icon?: LucideIcon; onSelect: () => void; disabled?: boolean }
  | 'separator';

/**
 * Icon-button dropdown menu (Radix: arrow keys, typeahead, Escape, focus
 * return), with a tooltip on its trigger.
 */
export function Menu(props: {
  label: string;
  icon: LucideIcon;
  tooltip?: string;
  items: readonly MenuItem[];
  align?: 'start' | 'end';
}) {
  const Icon = props.icon;
  return (
    <DropdownMenu.Root>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <DropdownMenu.Trigger asChild>
            <button type="button" aria-label={props.label} className="ui-button ui-icon ui-ghost ui-md">
              <Icon aria-hidden="true" size={16} strokeWidth={1.75} />
            </button>
          </DropdownMenu.Trigger>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="ui-tooltip" side="bottom" sideOffset={6}>
            {props.tooltip ?? props.label}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="ui-menu"
          align={props.align ?? 'start'}
          sideOffset={6}
          collisionPadding={8}
        >
          {props.items.map((item, i) =>
            item === 'separator' ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: static list.
              <DropdownMenu.Separator key={i} className="ui-menu-separator" />
            ) : (
              <DropdownMenu.Item
                key={item.label}
                className="ui-menu-item"
                onSelect={item.onSelect}
                {...(item.disabled ? { disabled: true } : {})}
              >
                {item.icon && <item.icon aria-hidden="true" size={15} strokeWidth={1.75} />}
                {item.label}
              </DropdownMenu.Item>
            ),
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
