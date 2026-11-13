import type { HTMLAttributes } from 'react';

export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Spinner({
  label = 'Loading',
  size = 'md',
  className = '',
  ...props
}: SpinnerProps) {
  return (
    <span
      {...props}
      className={`ui-spinner ui-spinner--${size} ${className}`.trim()}
      role="status"
      aria-label={label}
    />
  );
}
