import type { HTMLAttributes } from 'react';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'information';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ variant = 'default', className = '', ...props }: BadgeProps) {
  return <span {...props} className={`ui-badge ui-badge--${variant} ${className}`.trim()} />;
}
