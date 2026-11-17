import type { PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';
import { BrandMark } from '@/components/common/BrandMark';
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
          <BrandMark size="large" />
          <span>{appConfig.name}</span>
        </Link>
        <section className="auth-layout__intro" aria-label="About AccessFlow">
          <p className="auth-layout__eyebrow">A clearer way to work</p>
          <h1>Move every request forward.</h1>
          <p>
            One secure workspace for approvals, teams, and the work that keeps your organization
            moving.
          </p>
          <div className="auth-layout__highlights" aria-hidden="true">
            <span>Thoughtful workflows</span>
            <span>Organization-wide visibility</span>
            <span>Secure by design</span>
          </div>
        </section>
        <div className="auth-layout__content">{children}</div>
        <p className="auth-layout__footnote">Secure access for your organization.</p>
      </div>
    </main>
  );
}
