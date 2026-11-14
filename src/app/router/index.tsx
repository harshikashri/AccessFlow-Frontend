import { lazy, Suspense, type PropsWithChildren } from 'react';
import { createBrowserRouter, RouterProvider, useLocation } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import App from '@/app/App';
import { AccountSettingsPage } from '@/app/pages/AccountSettingsPage';
import { FeaturePlaceholderPage } from '@/app/pages/FeaturePlaceholderPage';
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
import { DepartmentCreatePage } from '@/features/departments/pages/DepartmentCreatePage';
import { DepartmentDetailsPage } from '@/features/departments/pages/DepartmentDetailsPage';
import { DepartmentEditPage } from '@/features/departments/pages/DepartmentEditPage';
import { DepartmentListPage } from '@/features/departments/pages/DepartmentListPage';
import { UserCreatePage } from '@/features/users/pages/UserCreatePage';
import { UserDetailsPage } from '@/features/users/pages/UserDetailsPage';
import { UserEditPage } from '@/features/users/pages/UserEditPage';
import { UserListPage } from '@/features/users/pages/UserListPage';
import { useAuth } from '@/features/auth/context/useAuth';
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
        path: 'roles',
        element: (
          <AuthorizationRoute itemId="roles">
            <FeaturePlaceholderPage itemId="roles" />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'workflows',
        element: (
          <AuthorizationRoute itemId="workflows">
            <FeaturePlaceholderPage itemId="workflows" />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'requests',
        element: (
          <AuthorizationRoute itemId="request-list">
            <FeaturePlaceholderPage itemId="request-list" />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'requests/new',
        element: (
          <AuthorizationRoute itemId="new-request">
            <FeaturePlaceholderPage itemId="new-request" />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'approvals',
        element: (
          <AuthorizationRoute itemId="approvals">
            <FeaturePlaceholderPage itemId="approvals" />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'audit-logs',
        element: (
          <AuthorizationRoute itemId="audit-logs">
            <FeaturePlaceholderPage itemId="audit-logs" />
          </AuthorizationRoute>
        ),
      },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'settings', element: <AccountSettingsPage /> },
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
