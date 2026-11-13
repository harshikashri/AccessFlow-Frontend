export type DashboardType = 'DYNAMIC' | 'PLATFORM';

export type DashboardScope =
  | 'PLATFORM'
  | 'ORGANIZATION'
  | 'DEPARTMENT'
  | 'AUTHORIZED_REQUEST_HISTORY'
  | 'AUTHORIZED_APPROVAL_ASSIGNMENTS';

export interface DashboardWidget {
  key: string;
  title: string;
  description: string;
  category: string;
  scope: DashboardScope;
  supportedFilters: string[];
  kpiProvider: string | null;
  kpiStatus: 'IMPLEMENTED' | 'DEFERRED';
  analyticsProvider: string | null;
  analyticsStatus: 'IMPLEMENTED' | 'DEFERRED';
}

export interface DashboardConfiguration {
  dashboardType: DashboardType;
  userContext: {
    userId: string;
    organizationId: string | null;
  };
  widgets: DashboardWidget[];
  availableFilters: {
    dateRange: string[];
  };
  dateRangeOptions: {
    timeZone: string;
    interval: string;
    maxCustomRangeDays: number;
  };
}
