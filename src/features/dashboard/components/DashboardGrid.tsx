import type { PropsWithChildren } from 'react';

interface DashboardGridProps extends PropsWithChildren {
  variant?: 'default' | 'kpis';
}

export function DashboardGrid({ children, variant = 'default' }: DashboardGridProps) {
  return <div className={`dashboard-grid dashboard-grid--${variant}`}>{children}</div>;
}
