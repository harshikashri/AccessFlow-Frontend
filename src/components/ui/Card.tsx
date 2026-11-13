import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  title?: string;
  description?: string;
  action?: ReactNode;
  footer?: ReactNode;
  contentClassName?: string;
}

export function Card({
  title,
  description,
  action,
  footer,
  contentClassName = '',
  className = '',
  children,
  ...props
}: CardProps) {
  return (
    <article {...props} className={`ui-card ${className}`.trim()}>
      {(title || description || action) && (
        <header className="ui-card__header">
          <div>
            {title && <h2 className="ui-card__title">{title}</h2>}
            {description && <p className="ui-card__description">{description}</p>}
          </div>
          {action && <div className="ui-card__action">{action}</div>}
        </header>
      )}
      <div className={`ui-card__content ${contentClassName}`.trim()}>{children}</div>
      {footer && <footer className="ui-card__footer">{footer}</footer>}
    </article>
  );
}
