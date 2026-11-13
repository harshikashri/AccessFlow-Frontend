import { useId, type ReactNode } from 'react';

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  const titleId = useId();
  return (
    <section className="feedback-state" aria-labelledby={titleId}>
      {icon && (
        <span className="feedback-state__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <h2 id={titleId}>{title}</h2>
      {description && <p>{description}</p>}
      {action && <div className="feedback-state__action">{action}</div>}
    </section>
  );
}
