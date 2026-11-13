import type { PropsWithChildren } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoadingState } from '@/components/feedback/LoadingState';
import { useAuth } from '@/features/auth/context/useAuth';
import { canAccessNavigationItem, findNavigationItem } from '@/features/authorization/navigation';
import { APP_ROUTES } from '@/routes/route.constants';

interface AuthorizationRouteProps extends PropsWithChildren {
  itemId: string;
}

export function AuthorizationRoute({ itemId, children }: AuthorizationRouteProps) {
  const { authorizationStatus, user } = useAuth();
  const location = useLocation();

  if (authorizationStatus === 'loading') {
    return <LoadingState label="Checking your access" />;
  }

  const item = findNavigationItem(itemId);
  if (
    authorizationStatus !== 'available' ||
    !user ||
    !item ||
    !canAccessNavigationItem(user, item)
  ) {
    return <Navigate to={APP_ROUTES.forbidden} replace state={{ from: location }} />;
  }

  return children ? <>{children}</> : <Outlet />;
}
