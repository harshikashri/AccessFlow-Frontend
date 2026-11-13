import type { HTMLAttributes } from 'react';

export interface SeparatorProps extends HTMLAttributes<HTMLElement> {
  orientation?: 'horizontal' | 'vertical';
  decorative?: boolean;
}

export function Separator({
  orientation = 'horizontal',
  decorative = false,
  className = '',
  ...props
}: SeparatorProps) {
  if (orientation === 'horizontal') {
    return (
      <hr
        {...props}
        className={`ui-separator ui-separator--horizontal ${className}`.trim()}
        role={decorative ? 'none' : undefined}
      />
    );
  }

  return (
    <span
      {...props}
      className={`ui-separator ui-separator--vertical ${className}`.trim()}
      role={decorative ? 'none' : 'separator'}
      aria-orientation={decorative ? undefined : 'vertical'}
    />
  );
}
