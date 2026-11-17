import { lazy, Suspense, type PropsWithChildren } from 'react';
import { createBrowserRouter, Navigate, RouterProvider, useLocation } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import App from '@/app/App';
import { ForbiddenPage } from '@/app/pages/ForbiddenPage';
import { NotFoundPage } from '@/app/pages/NotFoundPage';
import { ProfilePage } from '@/app/pages/ProfilePage';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { PasswordTokenPage } from '@/features/auth/pages/PasswordTokenPage';
import { OrganizationCreatePage } from '@/features/organizations/pages/OrganizationCreatePage';
import { OrganizationDetailsPage } from '@/features/organizations/pages/OrganizationDetailsPage';
import { OrganizationEditPage } from '@/features/organizations/pages/OrganizationEditPage';
import { OrganizationListPage } from '@/features/organizations/pages/OrganizationListPage';
import { WorkflowCreatePage } from '@/features/workflows/pages/WorkflowCreatePage';
import { WorkflowDetailsPage } from '@/features/workflows/pages/WorkflowDetailsPage';
import { WorkflowEditPage } from '@/features/workflows/pages/WorkflowEditPage';
import { WorkflowListPage } from '@/features/workflows/pages/WorkflowListPage';
import { DepartmentCreatePage } from '@/features/departments/pages/DepartmentCreatePage';
import { DepartmentDetailsPage } from '@/features/departments/pages/DepartmentDetailsPage';
import { DepartmentEditPage } from '@/features/departments/pages/DepartmentEditPage';
import { DepartmentListPage } from '@/features/departments/pages/DepartmentListPage';
import { UserCreatePage } from '@/features/users/pages/UserCreatePage';
import { UserDetailsPage } from '@/features/users/pages/UserDetailsPage';
import { UserEditPage } from '@/features/users/pages/UserEditPage';
import { UserListPage } from '@/features/users/pages/UserListPage';
import { RoleCreatePage } from '@/features/roles/pages/RoleCreatePage';
import { RoleDetailsPage } from '@/features/roles/pages/RoleDetailsPage';
import { RoleEditPage } from '@/features/roles/pages/RoleEditPage';
import { RoleListPage } from '@/features/roles/pages/RoleListPage';
import { RequestCreatePage } from '@/features/requests/pages/RequestCreatePage';
import { RequestDetailsPage } from '@/features/requests/pages/RequestDetailsPage';
import { RequestEditPage } from '@/features/requests/pages/RequestEditPage';
import { RequestListPage } from '@/features/requests/pages/RequestListPage';
import { ApprovalDetailsPage } from '@/features/approvals/pages/ApprovalDetailsPage';
import { ApprovalInboxPage } from '@/features/approvals/pages/ApprovalInboxPage';
import { DelegationPage } from '@/features/approvals/pages/DelegationPage';
import { AuditLogDetailsPage } from '@/features/audit-logs/pages/AuditLogDetailsPage';
import { AuditLogsPage } from '@/features/audit-logs/pages/AuditLogsPage';
import { SettingsOverviewPage } from '@/features/settings/pages/SettingsOverviewPage';
import { ProfileSettingsPage } from '@/features/settings/pages/ProfileSettingsPage';
import { SecuritySettingsPage } from '@/features/settings/pages/SecuritySettingsPage';
import { OrganizationSettingsPage } from '@/features/settings/pages/OrganizationSettingsPage';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { useAuth } from '@/features/auth/context/useAuth';
import { isPlatformSession } from '@/features/authorization/navigation';
import { getAuthReturnPath } from '@/features/auth/utils/auth-navigation';
import { WorkspaceLayout } from '@/layouts/WorkspaceLayout';
import { AuthorizationRoute } from '@/routes/AuthorizationRoute';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { PublicRoute } from '@/routes/PublicRoute';
import { APP_ROUTES } from '@/routes/route.constants';

function GuestRoute({ children }: PropsWithChildren) {
  const { isInitializing, isAuthenticated } = useAuth();
  const location = useLocation();
  return (
    <PublicRoute
      isInitializing={isInitializing}
      isAuthenticated={isAuthenticated}
      redirectTo={getAuthReturnPath(location.state)}
    >
      {children}
    </PublicRoute>
  );
}

function PrivateRoute({ children }: PropsWithChildren) {
  const { isInitializing, isAuthenticated } = useAuth();
  return (
    <ProtectedRoute isInitializing={isInitializing} isAllowed={isAuthenticated}>
      {children}
    </ProtectedRoute>
  );
}

function TenantSettingsRoute({ children }: PropsWithChildren) {
  const { user } = useAuth();
  return isPlatformSession(user) ? <Navigate to={APP_ROUTES.settingsProfile} replace /> : children;
}

const routes: RouteObject[] = [
  {
    path: APP_ROUTES.root,
    element: (
      <PrivateRoute>
        <WorkspaceLayout />
      </PrivateRoute>
    ),
    children: [
      { index: true, element: <App /> },
      {
        path: 'dashboard/request-summary',
        element: (
          <AuthorizationRoute itemId="dashboard-request-summary">
            <DashboardPage section="request-summary" />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'dashboard/approval-summary',
        element: (
          <AuthorizationRoute itemId="dashboard-approval-summary">
            <DashboardPage section="approval-summary" />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'dashboard/approval-activity',
        element: (
          <AuthorizationRoute itemId="dashboard-approval-activity">
            <DashboardPage section="approval-activity" />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'dashboard/user-statistics',
        element: (
          <AuthorizationRoute itemId="dashboard-user-statistics">
            <DashboardPage section="user-statistics" />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'dashboard/department-overview',
        element: (
          <AuthorizationRoute itemId="dashboard-department-overview">
            <DashboardPage section="department-overview" />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'dashboard/org-analytics',
        element: (
          <AuthorizationRoute itemId="platform-organization-analytics">
            <DashboardPage section="organization-analytics" />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'dashboard/user-analytics',
        element: (
          <AuthorizationRoute itemId="platform-user-analytics">
            <DashboardPage section="user-analytics" />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'dashboard/platform-usage',
        element: (
          <AuthorizationRoute itemId="platform-usage">
            <DashboardPage section="platform-usage" />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'organizations',
        element: (
          <AuthorizationRoute itemId="organizations">
            <OrganizationListPage />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'organizations/new',
        element: (
          <AuthorizationRoute itemId="organizations">
            <OrganizationCreatePage />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'organizations/:organizationId/edit',
        element: (
          <AuthorizationRoute itemId="organizations">
            <OrganizationEditPage />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'organizations/:organizationId',
        element: (
          <AuthorizationRoute itemId="organizations">
            <OrganizationDetailsPage />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'departments/new',
        element: <DepartmentCreatePage />,
      },
      {
        path: 'departments/:departmentId/edit',
        element: (
          <AuthorizationRoute itemId="departments">
            <DepartmentEditPage />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'departments/:departmentId',
        element: (
          <AuthorizationRoute itemId="departments">
            <DepartmentDetailsPage />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'departments',
        element: (
          <AuthorizationRoute itemId="departments">
            <DepartmentListPage />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'users/new',
        element: (
          <AuthorizationRoute itemId="users-create">
            <UserCreatePage />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'users/:userId/edit',
        element: (
          <AuthorizationRoute itemId="users">
            <UserEditPage />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'users/:userId',
        element: (
          <AuthorizationRoute itemId="users">
            <UserDetailsPage />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'users',
        element: (
          <AuthorizationRoute itemId="users">
            <UserListPage />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'roles/new',
        element: (
          <AuthorizationRoute itemId="roles">
            <RoleCreatePage />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'roles/:roleId/edit',
        element: (
          <AuthorizationRoute itemId="roles">
            <RoleEditPage />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'roles/:roleId',
        element: (
          <AuthorizationRoute itemId="roles">
            <RoleDetailsPage />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'roles',
        element: (
          <AuthorizationRoute itemId="roles">
            <RoleListPage />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'workflows',
        element: (
          <AuthorizationRoute itemId="workflows">
            <WorkflowListPage />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'workflows/new',
        element: (
          <AuthorizationRoute itemId="workflows">
            <WorkflowCreatePage />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'workflows/:workflowId/edit',
        element: (
          <AuthorizationRoute itemId="workflows">
            <WorkflowEditPage />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'workflows/:workflowId',
        element: (
          <AuthorizationRoute itemId="workflows">
            <WorkflowDetailsPage />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'requests',
        element: (
          <AuthorizationRoute itemId="request-list">
            <RequestListPage />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'my-requests',
        element: (
          <AuthorizationRoute itemId="request-list">
            <RequestListPage mine />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'requests/new',
        element: (
          <AuthorizationRoute itemId="new-request">
            <RequestCreatePage />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'requests/:requestId/edit',
        element: (
          <AuthorizationRoute itemId="request-list">
            <RequestEditPage />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'requests/:requestId',
        element: (
          <AuthorizationRoute itemId="request-list">
            <RequestDetailsPage />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'approvals',
        element: (
          <AuthorizationRoute itemId="approvals">
            <ApprovalInboxPage />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'approvals/delegation',
        element: (
          <AuthorizationRoute itemId="approvals">
            <DelegationPage />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'approvals/:approvalStepId',
        element: (
          <AuthorizationRoute itemId="approvals">
            <ApprovalDetailsPage />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'audit-logs',
        element: <AuditLogsPage />,
      },
      { path: 'audit-logs/:auditLogId', element: <AuditLogDetailsPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'settings', element: <SettingsOverviewPage /> },
      { path: 'settings/profile', element: <ProfileSettingsPage /> },
      { path: 'settings/security', element: <SecuritySettingsPage /> },
      {
        path: 'settings/organization',
        element: (
          <TenantSettingsRoute>
            <OrganizationSettingsPage />
          </TenantSettingsRoute>
        ),
      },
      { path: '403', element: <ForbiddenPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: APP_ROUTES.signIn,
    element: (
      <GuestRoute>
        <LoginPage />
      </GuestRoute>
    ),
  },
  {
    path: APP_ROUTES.forgotPassword,
    element: (
      <GuestRoute>
        <ForgotPasswordPage />
      </GuestRoute>
    ),
  },
  {
    path: APP_ROUTES.resetPassword,
    element: (
      <GuestRoute>
        <PasswordTokenPage />
      </GuestRoute>
    ),
  },
  {
    path: APP_ROUTES.setPassword,
    element: (
      <GuestRoute>
        <PasswordTokenPage />
      </GuestRoute>
    ),
  },
];

if (import.meta.env.DEV) {
  const ComponentShowcasePage = lazy(() =>
    import('@/app/pages/ComponentShowcasePage').then((module) => ({
      default: module.ComponentShowcasePage,
    })),
  );
  routes.push({
    path: '/ui-showcase',
    element: (
      <Suspense fallback={null}>
        <ComponentShowcasePage />
      </Suspense>
    ),
  });
}

const appRouter = createBrowserRouter(routes);

export function AppRouter() {
  return <RouterProvider router={appRouter} />;
}
