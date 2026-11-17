import type { ReactNode } from 'react';
import { BackLink } from './BackLink';

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  eyebrow?: string;
  backLink?: { to: string; label: string };
}

export function PageHeader({ title, description, actions, eyebrow, backLink }: PageHeaderProps) {
  return (
    <>
      {backLink && <BackLink to={backLink.to} label={backLink.label} />}
      <header className="common-page-header">
        <div>
          {eyebrow && <p className="common-page-header__eyebrow">{eyebrow}</p>}
          <h1 className="common-page-header__title">{title}</h1>
          {description && <p className="common-page-header__description">{description}</p>}
        </div>
        {actions && <div className="common-page-header__actions">{actions}</div>}
      </header>
    </>
  );
}
