import { hasOrganizationPermission, hasPermission } from '@/features/authorization/permissions';
import { isPlatformSession } from '@/features/authorization/navigation';
import type { AuthenticatedUser } from '@/features/auth/types/auth.types';
import type {
  DashboardAnalyticsProvider,
  DashboardConfiguration,
  DashboardDateRangeFilter,
  DashboardKpi,
  DashboardWidget,
} from '@/features/dashboard/types/dashboard.types';

const platformWidgetKeys = new Set([
  'PLATFORM_OVERVIEW',
  'ORGANIZATION_ANALYTICS',
  'USER_ANALYTICS',
  'PLATFORM_USAGE_ANALYTICS',
  'DEPARTMENT_ANALYTICS',
  'PLATFORM_ACTIVITY',
]);

const kpiProvidersByKey: Record<string, readonly string[]> = {
  TOTAL_REQUESTS: ['REQUESTS', 'PLATFORM'],
  PENDING_REQUESTS: ['REQUESTS', 'PLATFORM'],
  APPROVED_REQUESTS: ['REQUESTS', 'PLATFORM'],
  REJECTED_REQUESTS: ['REQUESTS', 'PLATFORM'],
  RETURNED_REQUESTS: ['REQUESTS', 'PLATFORM'],
  ACCESSIBLE_REQUESTS: ['REQUESTS'],
  ACCESSIBLE_PENDING_REQUESTS: ['REQUESTS'],
  ACCESSIBLE_APPROVED_REQUESTS: ['REQUESTS'],
  ACCESSIBLE_REJECTED_REQUESTS: ['REQUESTS'],
  ACCESSIBLE_RETURNED_REQUESTS: ['REQUESTS'],
  MY_TOTAL_REQUESTS: ['REQUESTS'],
  MY_DRAFT_REQUESTS: ['REQUESTS'],
  MY_PENDING_REQUESTS: ['REQUESTS'],
  MY_APPROVED_REQUESTS: ['REQUESTS'],
  MY_REJECTED_REQUESTS: ['REQUESTS'],
  MY_RETURNED_REQUESTS: ['REQUESTS'],
  PENDING_APPROVAL: ['APPROVALS'],
  PENDING_MY_APPROVAL: ['APPROVALS'],
  AVAILABLE_TO_CLAIM: ['APPROVALS'],
  APPROVED_DECISIONS: ['APPROVALS'],
  REJECTED_DECISIONS: ['APPROVALS'],
  RETURNED_DECISIONS: ['APPROVALS'],
  APPROVED_BY_ME: ['APPROVALS'],
  REJECTED_BY_ME: ['APPROVALS'],
  RETURNED_BY_ME: ['APPROVALS'],
  OVERDUE_APPROVALS: ['APPROVALS'],
  TOTAL_APPROVED_AMOUNT: ['APPROVALS'],
  TOTAL_EMPLOYEES: ['ORGANIZATION'],
  TOTAL_DEPARTMENTS: ['ORGANIZATION', 'PLATFORM'],
  TOTAL_ROLES: ['ROLES'],
  BUILT_IN_ROLES: ['ROLES'],
  CUSTOM_ROLES: ['ROLES'],
  ACTIVE_ROLE_ASSIGNMENTS: ['ROLES'],
  TOTAL_ORGANIZATIONS: ['PLATFORM'],
  ACTIVE_ORGANIZATIONS: ['PLATFORM'],
  INACTIVE_ORGANIZATIONS: ['PLATFORM'],
  NEW_ORGANIZATIONS: ['PLATFORM'],
  TOTAL_USERS: ['PLATFORM'],
  ACTIVE_USERS: ['PLATFORM'],
  INACTIVE_USERS: ['PLATFORM'],
  TOTAL_ORGANIZATION_MEMBERSHIPS: ['PLATFORM'],
  ACTIVE_ORGANIZATION_MEMBERSHIPS: ['PLATFORM'],
  INACTIVE_ORGANIZATION_MEMBERSHIPS: ['PLATFORM'],
  CANCELLED_REQUESTS: ['PLATFORM'],
};

const analyticsProviders: ReadonlySet<string> = new Set([
  'ORGANIZATIONS',
  'USERS',
  'REQUESTS',
  'APPROVALS',
  'DEPARTMENTS',
  'ACTIVITY',
]);

export function isDashboardAnalyticsProvider(value: string): value is DashboardAnalyticsProvider {
  return analyticsProviders.has(value);
}

function hasScopedPermission(
  user: AuthenticatedUser,
  permission: Parameters<typeof hasPermission>[1],
): boolean {
  return hasPermission(user.authorization, permission, 'organization-or-department');
}

export function isDashboardWidgetAuthorized(
  widget: DashboardWidget,
  user: AuthenticatedUser,
): boolean {
  if (isPlatformSession(user)) {
    return widget.scope === 'PLATFORM' && platformWidgetKeys.has(widget.key);
  }
  if (widget.scope === 'PLATFORM') return false;

  switch (widget.key) {
    case 'REQUEST_SUMMARY':
      return hasScopedPermission(user, 'requests.view');
    case 'REQUEST_CREATE':
      return hasScopedPermission(user, 'requests.create');
    case 'APPROVAL_SUMMARY':
    case 'APPROVAL_ACTIVITY':
      return hasScopedPermission(user, 'requests.approve');
    case 'USER_STATISTICS':
      return hasScopedPermission(user, 'users.view');
    case 'DEPARTMENT_OVERVIEW':
      return hasScopedPermission(user, 'departments.view');
    case 'ROLE_OVERVIEW':
      return hasOrganizationPermission(user.authorization, 'roles.view');
    case 'AUDIT_ACTIVITY':
      return hasScopedPermission(user, 'audit_logs.view');
    default:
      return false;
  }
}

export function getAuthorizedDashboardWidgets(
  configuration: DashboardConfiguration,
  user: AuthenticatedUser,
): DashboardWidget[] {
  return configuration.widgets.filter((widget) => isDashboardWidgetAuthorized(widget, user));
}

export function getAnalyticsProviders(
  widgets: readonly DashboardWidget[],
): DashboardAnalyticsProvider[] {
  const providers = new Set<DashboardAnalyticsProvider>();
  for (const widget of widgets) {
    if (
      widget.analyticsStatus === 'IMPLEMENTED' &&
      widget.analyticsProvider &&
      isDashboardAnalyticsProvider(widget.analyticsProvider)
    ) {
      providers.add(widget.analyticsProvider);
    }
  }
  return [...providers];
}

export function getDashboardKpis(
  kpis: readonly DashboardKpi[],
  widgets: readonly DashboardWidget[],
): DashboardKpi[] {
  const providers = new Set(
    widgets
      .filter((widget) => widget.kpiStatus === 'IMPLEMENTED' && widget.kpiProvider)
      .map((widget) => widget.kpiProvider)
      .filter((provider): provider is string => Boolean(provider)),
  );
  return kpis.filter((kpi) =>
    kpiProvidersByKey[kpi.key]?.some((provider) => providers.has(provider)),
  );
}

export function formatDashboardKpi(
  value: number,
  format: DashboardKpi['format'],
  unit?: string,
): string {
  const formatted = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
  return format === 'AMOUNT' && unit ? `${formatted} ${unit}` : formatted;
}

export function isValidDashboardDateFilter(
  filter: DashboardDateRangeFilter,
  maxCustomRangeDays: number,
  now = new Date(),
): boolean {
  if (filter.range !== 'CUSTOM') return true;
  if (!filter.fromDate || !filter.toDate) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(filter.fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(filter.toDate)) {
    return false;
  }
  const from = Date.parse(`${filter.fromDate}T00:00:00.000Z`);
  const to = Date.parse(`${filter.toDate}T00:00:00.000Z`);
  const maxRangeMs = maxCustomRangeDays * 24 * 60 * 60 * 1000;
  return (
    Number.isFinite(from) &&
    Number.isFinite(to) &&
    from < to &&
    to <= now.getTime() &&
    to - from <= maxRangeMs
  );
}
