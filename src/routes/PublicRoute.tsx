import type { PropsWithChildren } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { LoadingState } from '@/components/feedback/LoadingState';
import { APP_ROUTES } from '@/routes/route.constants';

interface PublicRouteProps extends PropsWithChildren {
  isAuthenticated: boolean;
  isInitializing?: boolean;
  redirectTo?: string;
}

export function PublicRoute({
  isAuthenticated,
  isInitializing = false,
  redirectTo = APP_ROUTES.dashboard,
  children,
}: PublicRouteProps) {
  if (isInitializing) {
    return <LoadingState label="Restoring your session" />;
  }

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
