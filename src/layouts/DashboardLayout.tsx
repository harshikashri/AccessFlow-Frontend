import type { PropsWithChildren } from 'react';

export function DashboardLayout({ children }: PropsWithChildren) {
  return <div className="dashboard-layout">{children}</div>;
}
