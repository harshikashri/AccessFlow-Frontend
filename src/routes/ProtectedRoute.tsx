import type { PropsWithChildren } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoadingState } from '@/components/feedback/LoadingState';
import { APP_ROUTES } from '@/routes/route.constants';

interface ProtectedRouteProps extends PropsWithChildren {
  isAllowed: boolean;
  isInitializing?: boolean;
  redirectTo?: string;
}

export function ProtectedRoute({
  isAllowed,
  isInitializing = false,
  redirectTo = APP_ROUTES.signIn,
  children,
}: ProtectedRouteProps) {
  const location = useLocation();

  if (isInitializing) {
    return <LoadingState label="Restoring your session" />;
  }

  if (!isAllowed) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  return children ? <>{children}</> : <Outlet />;
}
