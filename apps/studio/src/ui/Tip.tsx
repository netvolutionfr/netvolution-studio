import * as Tooltip from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';

/** Tooltip on hover and keyboard focus (Radix: accessible description, Escape to dismiss). */
export function Tip(props: {
  content: ReactNode;
  shortcut?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  children: ReactNode;
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{props.children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          className="ui-tooltip"
          side={props.side ?? 'bottom'}
          sideOffset={6}
          collisionPadding={8}
        >
          {props.content}
          {props.shortcut && <kbd className="ui-kbd">{props.shortcut}</kbd>}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export const TipProvider = Tooltip.Provider;
