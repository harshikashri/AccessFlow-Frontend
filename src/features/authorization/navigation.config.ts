import { APP_ROUTES } from '@/routes/route.constants';
import type { PermissionId } from './permission-catalog';
import type { PermissionScope } from './authorization.types';

export type NavigationIcon =
  | 'dashboard'
  | 'organizations'
  | 'departments'
  | 'users'
  | 'roles'
  | 'workflows'
  | 'requests'
  | 'create'
  | 'approvals'
  | 'audit'
  | 'profile'
  | 'settings';

export type NavigationRequirement =
  | { kind: 'platform-session' }
  | {
      kind: 'permissions';
      permissions: readonly PermissionId[];
      mode: 'any' | 'all';
      scope: PermissionScope;
    };

export interface NavigationItem {
  id: string;
  label: string;
  icon: NavigationIcon;
  description?: string;
  section?: string;
  path?: string;
  requirement?: NavigationRequirement;
  children?: readonly NavigationItem[];
}

export interface NavigationSection {
  id: string;
  label: string;
  items: readonly NavigationItem[];
}

const permissionRequirement = (
  permission: PermissionId,
  scope: PermissionScope,
): NavigationRequirement => ({
  kind: 'permissions',
  permissions: [permission],
  mode: 'any',
  scope,
});

export const NAVIGATION_SECTIONS: readonly NavigationSection[] = [
  {
    id: 'platform',
    label: 'Platform',
    items: [
      {
        id: 'platform-dashboard',
        label: 'Platform dashboard',
        icon: 'dashboard',
        description: 'A future home for platform-level operations.',
        section: 'Platform',
        path: APP_ROUTES.dashboard,
        requirement: { kind: 'platform-session' },
      },
      {
        id: 'organizations',
        label: 'Organizations',
        icon: 'organizations',
        description: 'A future workspace for platform organization management.',
        section: 'Platform',
        path: APP_ROUTES.organizations,
        requirement: { kind: 'platform-session' },
      },
    ],
  },
  {
    id: 'workspace',
    label: 'Workspace',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: 'dashboard',
        description: 'Your organization workspace overview.',
        section: 'Workspace',
        path: APP_ROUTES.dashboard,
        requirement: permissionRequirement('dashboard.view', 'organization-or-department'),
      },
    ],
  },
  {
    id: 'organization',
    label: 'Organization',
    items: [
      {
        id: 'departments',
        label: 'Departments',
        icon: 'departments',
        description: 'Department access is limited to your effective permission scopes.',
        section: 'Organization',
        path: APP_ROUTES.departments,
        requirement: permissionRequirement('departments.view', 'organization-or-department'),
      },
      {
        id: 'users',
        label: 'Users',
        icon: 'users',
        description: 'User access is limited to your effective permission scopes.',
        section: 'Organization',
        path: APP_ROUTES.users,
        requirement: permissionRequirement('users.view', 'organization-or-department'),
      },
      {
        id: 'roles',
        label: 'Roles and permissions',
        icon: 'roles',
        description: 'Role management is a planned feature; no role data is loaded here.',
        section: 'Organization',
        path: APP_ROUTES.roles,
        requirement: permissionRequirement('roles.view', 'organization'),
      },
      {
        id: 'workflows',
        label: 'Workflows',
        icon: 'workflows',
        description: 'Workflow management is a planned feature; no workflow data is loaded here.',
        section: 'Organization',
        path: APP_ROUTES.workflows,
        requirement: permissionRequirement('workflows.view', 'organization'),
      },
      {
        id: 'audit-logs',
        label: 'Audit logs',
        icon: 'audit',
        description: 'Audit history is a planned feature; no audit data is loaded here.',
        section: 'Organization',
        path: APP_ROUTES.auditLogs,
        requirement: permissionRequirement('audit_logs.view', 'organization-or-department'),
      },
    ],
  },
  {
    id: 'requests',
    label: 'Requests',
    items: [
      {
        id: 'request-center',
        label: 'Request center',
        icon: 'requests',
        children: [
          {
            id: 'request-list',
            label: 'Requests',
            icon: 'requests',
            description: 'Request history will be limited by the backend to your authorized scope.',
            section: 'Requests',
            path: APP_ROUTES.requests,
            requirement: permissionRequirement('requests.view', 'organization-or-department'),
          },
          {
            id: 'new-request',
            label: 'New request',
            icon: 'create',
            description: 'Request creation will be limited to your authorized scope.',
            section: 'Requests',
            path: APP_ROUTES.newRequest,
            requirement: permissionRequirement('requests.create', 'organization-or-department'),
          },
          {
            id: 'approvals',
            label: 'Approvals',
            icon: 'approvals',
            description: 'Approval items will be returned only when assigned or delegated to you.',
            section: 'Requests',
            path: APP_ROUTES.approvals,
            requirement: permissionRequirement('requests.approve', 'organization-or-department'),
          },
        ],
      },
    ],
  },
];
