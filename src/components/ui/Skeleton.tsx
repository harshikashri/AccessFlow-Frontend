import type { CSSProperties, HTMLAttributes } from 'react';

export interface SkeletonProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'line' | 'circle' | 'rect';
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
}

export function Skeleton({
  variant = 'line',
  width,
  height,
  className = '',
  style,
  ...props
}: SkeletonProps) {
  return (
    <span
      {...props}
      className={`ui-skeleton ui-skeleton--${variant} ${className}`.trim()}
      style={{ ...style, width, height }}
      aria-hidden="true"
    />
  );
}
