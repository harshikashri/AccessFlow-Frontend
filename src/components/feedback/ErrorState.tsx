import { Alert } from '@/components/ui/Alert';
import type { ReactNode } from 'react';

export interface ErrorStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function ErrorState({ title, description, action }: ErrorStateProps) {
  return (
    <section className="feedback-error" aria-labelledby="feedback-error-title">
      <Alert variant="error" title={title}>
        <p id="feedback-error-title">{description}</p>
        {action && <div className="feedback-error__action">{action}</div>}
      </Alert>
    </section>
  );
}
