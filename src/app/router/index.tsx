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
            <FeaturePlaceholderPage itemId="organizations" />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'departments',
        element: (
          <AuthorizationRoute itemId="departments">
            <FeaturePlaceholderPage itemId="departments" />
          </AuthorizationRoute>
        ),
      },
      {
        path: 'users',
        element: (
          <AuthorizationRoute itemId="users">
            <FeaturePlaceholderPage itemId="users" />
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
