import type { LucideIcon } from 'lucide-react';
import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from 'react';
import { Tip } from './Tip.tsx';

type Variant = 'default' | 'ghost' | 'primary' | 'danger';
type Size = 'sm' | 'md';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  children?: ReactNode;
};

/** Text button, optionally with a leading icon. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'default', size = 'md', icon: Icon, children, className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`ui-button ui-${variant} ui-${size} ${className ?? ''}`}
      {...rest}
    >
      {Icon && <Icon aria-hidden="true" size={size === 'sm' ? 14 : 16} strokeWidth={1.75} />}
      {children}
    </button>
  );
});

export type IconButtonProps = Omit<ButtonProps, 'children' | 'icon'> & {
  /** Accessible name, also shown as tooltip. */
  label: string;
  icon: LucideIcon;
  shortcut?: string;
  tooltip?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
};

/** Icon-only button: the label is its accessible name and its tooltip. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    label,
    icon: Icon,
    shortcut,
    tooltip,
    side,
    variant = 'ghost',
    size = 'md',
    className,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <Tip content={tooltip ?? label} {...(shortcut ? { shortcut } : {})} {...(side ? { side } : {})}>
      <button
        ref={ref}
        type={type}
        aria-label={label}
        className={`ui-button ui-icon ui-${variant} ui-${size} ${className ?? ''}`}
        {...rest}
      >
        <Icon aria-hidden="true" size={size === 'sm' ? 14 : 16} strokeWidth={1.75} />
      </button>
    </Tip>
  );
});
