import type { PropsWithChildren } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { APP_ROUTES } from '@/routes/route.constants';

interface PublicRouteProps extends PropsWithChildren {
  isAuthenticated: boolean;
  redirectTo?: string;
}

export function PublicRoute({
  isAuthenticated,
  redirectTo = APP_ROUTES.dashboard,
  children,
}: PublicRouteProps) {
  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
