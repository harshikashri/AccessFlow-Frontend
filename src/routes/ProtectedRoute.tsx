import type { PropsWithChildren } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { APP_ROUTES } from '@/routes/route.constants';

interface ProtectedRouteProps extends PropsWithChildren {
  isAllowed: boolean;
  redirectTo?: string;
}

export function ProtectedRoute({
  isAllowed,
  redirectTo = APP_ROUTES.signIn,
  children,
}: ProtectedRouteProps) {
  if (!isAllowed) {
    return <Navigate to={redirectTo} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
