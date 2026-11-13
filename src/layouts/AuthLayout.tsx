import type { PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';
import { appConfig } from '@/config/app.config';
import { APP_ROUTES } from '@/routes/route.constants';

export function AuthLayout({ children }: PropsWithChildren) {
  return (
    <main className="auth-layout">
      <div className="auth-layout__inner">
        <Link
          className="auth-brand"
          to={APP_ROUTES.signIn}
          aria-label={`${appConfig.name} sign in`}
        >
          <span className="auth-brand__mark" aria-hidden="true">
            A
          </span>
          <span>{appConfig.name}</span>
        </Link>
        <div className="auth-layout__content">{children}</div>
        <p className="auth-layout__footnote">Secure access for your organization.</p>
      </div>
    </main>
  );
}
