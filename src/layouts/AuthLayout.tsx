import type { PropsWithChildren } from 'react';

export function AuthLayout({ children }: PropsWithChildren) {
  return <main className="auth-layout">{children}</main>;
}
