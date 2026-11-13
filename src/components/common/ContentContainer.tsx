import type { HTMLAttributes } from 'react';

export function ContentContainer({ className = '', ...props }: HTMLAttributes<HTMLElement>) {
  return <main {...props} className={`common-content-container ${className}`.trim()} />;
}
