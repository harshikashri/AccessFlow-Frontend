import type {
  DashboardAnalyticsProvider,
  DashboardDateRangeFilter,
} from '@/features/dashboard/types/dashboard.types';

function filterKey(filter: DashboardDateRangeFilter) {
  return [filter.range, filter.fromDate ?? '', filter.toDate ?? ''] as const;
}

export const dashboardQueryKeys = {
  all: ['dashboard'] as const,
  user: (userId: string) => ['dashboard', userId] as const,
  configuration: (userId: string) => ['dashboard', userId, 'configuration'] as const,
  summary: (userId: string, filter: DashboardDateRangeFilter) =>
    ['dashboard', userId, 'summary', ...filterKey(filter)] as const,
  analytics: (
    userId: string,
    provider: DashboardAnalyticsProvider,
    filter: DashboardDateRangeFilter,
    page: number,
  ) => ['dashboard', userId, 'analytics', provider, ...filterKey(filter), page] as const,
};
