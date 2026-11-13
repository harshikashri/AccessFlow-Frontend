import { Skeleton } from '@/components/ui';

export function DashboardSkeleton() {
  return (
    <div
      className="dashboard-loading"
      role="status"
      aria-label="Loading dashboard"
      aria-busy="true"
    >
      <Skeleton width="12rem" height="1.5rem" />
      <div className="dashboard-grid dashboard-grid--kpis">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="dashboard-loading__kpi" key={index}>
            <Skeleton width="8rem" />
            <Skeleton width="5rem" height="2rem" />
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        {Array.from({ length: 2 }, (_, index) => (
          <div className="dashboard-loading__chart" key={index}>
            <Skeleton width="10rem" />
            <Skeleton variant="rect" height="13rem" />
          </div>
        ))}
      </div>
    </div>
  );
}
