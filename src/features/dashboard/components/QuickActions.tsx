import { Link } from 'react-router-dom';
import { AppIcon } from '@/components/common/AppIcon';
import type { AppIconName } from '@/components/common/AppIcon';
import { Card } from '@/components/ui';
import { hasOrganizationPermission, hasPermission } from '@/features/authorization/permissions';
import { isPlatformSession } from '@/features/authorization/navigation';
import type { AuthenticatedUser } from '@/features/auth/types/auth.types';
import { APP_ROUTES } from '@/routes/route.constants';

interface DashboardAction {
  label: string;
  path: string;
  icon: AppIconName;
}

function getDashboardActions(user: AuthenticatedUser): DashboardAction[] {
  if (isPlatformSession(user)) {
    return [{ label: 'View organizations', path: APP_ROUTES.organizations, icon: 'organizations' }];
  }

  const can = (permission: Parameters<typeof hasPermission>[1]) =>
    hasPermission(user.authorization, permission, 'organization-or-department');
  const actions: DashboardAction[] = [];

  if (can('requests.create')) {
    actions.push({ label: 'Create request', path: APP_ROUTES.newRequest, icon: 'create' });
  }
  if (can('requests.view')) {
    actions.push({ label: 'View requests', path: APP_ROUTES.requests, icon: 'requests' });
  }
  if (can('requests.approve')) {
    actions.push({ label: 'Open approvals', path: APP_ROUTES.approvals, icon: 'approvals' });
  }
  if (can('users.view') && can('users.create')) {
    actions.push({ label: 'Add a user', path: APP_ROUTES.users, icon: 'users' });
  }
  if (can('departments.view') && can('departments.create')) {
    actions.push({
      label: 'Create department',
      path: APP_ROUTES.departments,
      icon: 'departments',
    });
  }
  if (hasOrganizationPermission(user.authorization, 'roles.view')) {
    actions.push({ label: 'Manage roles', path: APP_ROUTES.roles, icon: 'roles' });
  }
  if (can('audit_logs.view')) {
    actions.push({ label: 'View audit logs', path: APP_ROUTES.auditLogs, icon: 'audit' });
  }
  return actions;
}

export function QuickActions({ user }: { user: AuthenticatedUser }) {
  const actions = getDashboardActions(user);
  if (actions.length === 0) return null;

  return (
    <Card title="Quick actions" className="dashboard-widget dashboard-widget--wide">
      <nav className="dashboard-actions" aria-label="Dashboard quick actions">
        {actions.map((action) => (
          <Link className="dashboard-action" key={action.path} to={action.path}>
            <AppIcon name={action.icon} size={18} />
            <span>{action.label}</span>
            <AppIcon name="chevron" size={16} />
          </Link>
        ))}
      </nav>
    </Card>
  );
}
