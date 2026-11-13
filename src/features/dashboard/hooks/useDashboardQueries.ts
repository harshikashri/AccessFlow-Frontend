import { useQueries, useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import type { AuthenticatedUser } from '@/features/auth/types/auth.types';
import { dashboardService } from '@/features/dashboard/services/dashboard.service';
import type {
  DashboardAnalyticsData,
  DashboardAnalyticsProvider,
  DashboardConfiguration,
  DashboardDateRangeFilter,
  DashboardSummary,
} from '@/features/dashboard/types/dashboard.types';
import {
  getAnalyticsProviders,
  getAuthorizedDashboardWidgets,
} from '@/features/dashboard/utils/dashboard.utils';
import { dashboardQueryKeys } from './dashboard-query-keys';

export function useDashboardConfiguration(user: AuthenticatedUser) {
  return useQuery({
    queryKey: dashboardQueryKeys.configuration(user.id),
    queryFn: () => dashboardService.getConfiguration(),
  });
}

export function useDashboardContent(
  user: AuthenticatedUser,
  configuration: DashboardConfiguration,
  filter: DashboardDateRangeFilter,
  activityPage: number,
): {
  summary: UseQueryResult<DashboardSummary, Error>;
  analytics: Map<DashboardAnalyticsProvider, UseQueryResult<DashboardAnalyticsData, Error>>;
} {
  const widgets = getAuthorizedDashboardWidgets(configuration, user);
  const providers = getAnalyticsProviders(widgets);
  const summary = useQuery({
    queryKey: dashboardQueryKeys.summary(user.id, filter),
    queryFn: () => dashboardService.getSummary(filter),
  });
  const analyticsQueries = useQueries({
    queries: providers.map((provider) => {
      const page = provider === 'ACTIVITY' ? activityPage : 1;
      return {
        queryKey: dashboardQueryKeys.analytics(user.id, provider, filter, page),
        queryFn: () => dashboardService.getAnalytics(provider, filter, page),
      };
    }),
  });

  const analytics = new Map<
    DashboardAnalyticsProvider,
    UseQueryResult<DashboardAnalyticsData, Error>
  >();
  providers.forEach((provider, index) => {
    const query = analyticsQueries[index];
    if (query) analytics.set(provider, query);
  });

  return { summary, analytics };
}

export function getDashboardQueryKeys(userId: string) {
  return dashboardQueryKeys.user(userId);
}
