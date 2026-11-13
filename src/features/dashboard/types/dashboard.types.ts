export type DashboardType = 'DYNAMIC' | 'PLATFORM';

export type DashboardScope =
  | 'PLATFORM'
  | 'ORGANIZATION'
  | 'DEPARTMENT'
  | 'AUTHORIZED_REQUEST_HISTORY'
  | 'AUTHORIZED_APPROVAL_ASSIGNMENTS';

export type DashboardDateRange =
  'LAST_7_DAYS' | 'LAST_30_DAYS' | 'LAST_90_DAYS' | 'THIS_MONTH' | 'THIS_YEAR' | 'CUSTOM';

export interface DashboardDateRangeInfo {
  range: DashboardDateRange;
  fromDate: string;
  toDate: string;
  timeZone: string;
  interval: string;
}

export interface DashboardDateRangeFilter {
  range: DashboardDateRange;
  fromDate?: string;
  toDate?: string;
}

export type DashboardProviderStatus = 'IMPLEMENTED' | 'DEFERRED';

export interface DashboardWidget {
  key: string;
  title: string;
  description: string;
  category: string;
  scope: DashboardScope;
  supportedFilters: string[];
  kpiProvider?: string | null;
  kpiStatus: DashboardProviderStatus;
  analyticsProvider?: string | null;
  analyticsStatus: DashboardProviderStatus;
}

export interface DashboardConfiguration {
  dashboardType: DashboardType;
  userContext: {
    userId: string;
    organizationId: string | null;
  };
  widgets: DashboardWidget[];
  availableFilters: {
    dateRange: DashboardDateRange[];
  };
  dateRangeOptions: {
    timeZone: string;
    interval: string;
    maxCustomRangeDays: number;
  };
}

export interface DashboardKpi {
  key: string;
  title: string;
  value: number;
  format: 'NUMBER' | 'AMOUNT';
  trend: null;
  unit?: string;
}

export interface DeferredDashboardWidget {
  key: string;
  title: string;
}

export interface DashboardSummary {
  dashboardType: DashboardType;
  dateRange: DashboardDateRangeInfo;
  widgets: DashboardWidget[];
  deferredWidgets: DeferredDashboardWidget[];
  kpis: DashboardKpi[];
}

export interface DashboardTrendPoint {
  period: string;
  periodStart: string;
  count: number;
}

export interface DashboardStatusCount {
  status: string;
  count: number;
}

export interface DashboardPeriodComparison {
  currentPeriodCount: number;
  previousPeriodCount: number;
  absoluteDifference: number;
  percentageChange: number | null;
}

export interface OrganizationAnalyticsRow {
  organizationId: string;
  organizationName: string;
  status: string;
  createdAt: string;
  totalMemberships: number;
  activeMemberships: number;
  inactiveMemberships: number;
  totalDepartments: number;
  totalRequests: number;
  periodRequests: number;
}

export interface OrganizationAnalytics {
  scope: 'PLATFORM';
  grouping: string;
  registrationTrends: DashboardTrendPoint[];
  statusDistribution: DashboardStatusCount[];
  organizationComparison: DashboardPeriodComparison;
  organizations: OrganizationAnalyticsRow[];
  dateRange: DashboardDateRangeInfo;
}

export interface UserDepartmentAnalyticsRow {
  departmentId: string;
  departmentName: string;
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
}

export interface UserOrganizationAnalyticsRow {
  organizationId: string;
  organizationName: string;
  totalMemberships: number;
  activeMemberships: number;
  inactiveMemberships: number;
}

export interface UserRoleCategoryAnalyticsRow {
  roleCategory: string;
  uniqueUsers: number;
  metricBasis: string;
}

export interface TenantUserAnalytics {
  scope: 'ORGANIZATION' | 'DEPARTMENT';
  grouping: string;
  userCounts: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
  };
  registrationTrends: DashboardTrendPoint[];
  byDepartment: UserDepartmentAnalyticsRow[];
  dateRange: DashboardDateRangeInfo;
}

export interface PlatformUserAnalytics {
  scope: 'PLATFORM';
  grouping: string;
  userCounts: {
    totalUniqueUsers: number;
    activeUniqueUsers: number;
    inactiveUniqueUsers: number;
    activeUserBasis: string;
  };
  membershipCounts: Record<string, number>;
  byOrganization: UserOrganizationAnalyticsRow[];
  byRoleCategory: UserRoleCategoryAnalyticsRow[];
  registrationTrends: DashboardTrendPoint[];
  dateRange: DashboardDateRangeInfo;
}

export type UserAnalytics = TenantUserAnalytics | PlatformUserAnalytics;

export interface TenantRequestTypeAnalyticsRow {
  requestTypeId: string | null;
  requestType: string;
  total: number;
  percentage: number;
  statusCounts: DashboardStatusCount[];
}

export interface PlatformRequestTypeAnalyticsRow {
  requestType: string;
  total: number;
}

export interface PlatformRequestsByOrganizationRow {
  organizationId: string;
  organizationName: string;
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  returnedRequests: number;
}

export interface RequestAnalytics {
  scope: DashboardScope;
  grouping: string;
  requestTrends: DashboardTrendPoint[];
  statusDistribution: DashboardStatusCount[];
  requestTypes: Array<TenantRequestTypeAnalyticsRow | PlatformRequestTypeAnalyticsRow>;
  requestVolumeComparison: DashboardPeriodComparison;
  requestsByOrganization?: PlatformRequestsByOrganizationRow[];
  dateRange: DashboardDateRangeInfo;
}

export interface ApprovalStageAnalyticsRow {
  stageId: string;
  stageName: string;
  totalSteps: number;
  pendingSteps: number;
  completedSteps: number;
  approvedSteps: number;
  rejectedSteps: number;
  returnedSteps: number;
}

export interface ApprovalAnalytics {
  scope: 'AUTHORIZED_APPROVAL_ASSIGNMENTS';
  approvalStatusDistribution: DashboardStatusCount[];
  decisions: Array<{ decision: string; count: number }>;
  stages: ApprovalStageAnalyticsRow[];
  workload: {
    pendingApprovalStages: number;
    availableToClaimStages: number;
    currentlyOverdueStages: number;
  };
  performance: {
    completedDecisions: number;
    averageDecisionMinutes: number | null;
    medianDecisionMinutes: number | null;
    slaDecisionSampleSize: number;
    onTimeDecisions: number;
    overdueDecisions: number;
    slaCompliancePercentage: number | null;
  };
  dateRange: DashboardDateRangeInfo;
}

export interface TenantRequestDepartmentAnalyticsRow {
  departmentId: string;
  departmentName: string;
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  returnedRequests: number;
  averageApprovalMinutes: null;
}

export interface TenantApprovalDepartmentAnalyticsRow {
  departmentId: string;
  departmentName: string;
  assignedApprovalStages: number;
  pendingApprovalStages: number;
  completedDecisions: number;
  averageDecisionMinutes: number | null;
}

export interface TenantDepartmentDirectory {
  total: number;
  active: number;
  inactive: number;
  departments: Array<{
    departmentId: string;
    departmentName: string;
    status: string;
  }>;
}

export interface TenantDepartmentAnalytics {
  scope: Exclude<DashboardScope, 'PLATFORM'>;
  departments?: Array<TenantRequestDepartmentAnalyticsRow | TenantApprovalDepartmentAnalyticsRow>;
  departmentDirectory?: TenantDepartmentDirectory;
  dateRange: DashboardDateRangeInfo;
}

export interface PlatformDepartmentAnalytics {
  scope: 'PLATFORM';
  totalDepartments: number;
  statusDistribution: DashboardStatusCount[];
  byOrganization: Array<{
    organizationId: string;
    organizationName: string;
    totalDepartments: number;
    activeDepartments: number;
    inactiveDepartments: number;
  }>;
  departmentGrowth: DashboardTrendPoint[];
  grouping: string;
  dateRange: DashboardDateRangeInfo;
}

export type DepartmentAnalytics = TenantDepartmentAnalytics | PlatformDepartmentAnalytics;

export interface TenantActivityItem {
  activityId: string;
  type: 'REQUEST' | 'APPROVAL' | 'DELEGATION';
  action: string;
  actionLabel: string;
  actorId: string;
  actorName: string;
  requestId: string | null;
  requestNumber: string | null;
  requestType: string | null;
  stage: { id: string; name: string } | null;
  timestamp: string;
}

export interface PlatformActivityItem {
  activityId: string;
  action: string;
  actor: { id: string; name: string };
  organization: { id: string; name: string };
  target: { type: string; id: string };
  timestamp: string;
}

export interface ActivityPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

export interface TenantActivityAnalytics {
  scope: Exclude<DashboardScope, 'PLATFORM'>;
  items: TenantActivityItem[];
  pagination: ActivityPagination;
  dateRange: DashboardDateRangeInfo;
}

export interface PlatformActivityAnalytics {
  scope: 'PLATFORM';
  items: PlatformActivityItem[];
  pagination: ActivityPagination & {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  dateRange: DashboardDateRangeInfo;
}

export type ActivityAnalytics = TenantActivityAnalytics | PlatformActivityAnalytics;

export type DashboardAnalyticsProvider =
  'ORGANIZATIONS' | 'USERS' | 'REQUESTS' | 'APPROVALS' | 'DEPARTMENTS' | 'ACTIVITY';

export type DashboardAnalyticsData =
  | OrganizationAnalytics
  | UserAnalytics
  | RequestAnalytics
  | ApprovalAnalytics
  | DepartmentAnalytics
  | ActivityAnalytics;
