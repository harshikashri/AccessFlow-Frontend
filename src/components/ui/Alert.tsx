import type { HTMLAttributes, ReactNode } from 'react';

export type AlertVariant = 'success' | 'information' | 'warning' | 'error';

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  icon?: ReactNode;
}

export function Alert({
  variant = 'information',
  title,
  icon,
  className = '',
  children,
  ...props
}: AlertProps) {
  return (
    <div
      {...props}
      className={`ui-alert ui-alert--${variant} ${className}`.trim()}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      {icon && (
        <span className="ui-alert__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <div>
        {title && <p className="ui-alert__title">{title}</p>}
        <div className="ui-alert__content">{children}</div>
      </div>
    </div>
  );
}
