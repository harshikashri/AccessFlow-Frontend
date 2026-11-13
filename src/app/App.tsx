import { Navigate } from 'react-router-dom';
import { LoadingState } from '@/components/feedback/LoadingState';
import { useAuth } from '@/features/auth/context/useAuth';
import {
  getFirstNavigationPath,
  getVisibleNavigation,
  isPlatformSession,
} from '@/features/authorization/navigation';
import { hasPermission } from '@/features/authorization/permissions';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { APP_ROUTES } from '@/routes/route.constants';

export function App() {
  const { authorizationStatus, user } = useAuth();

  if (authorizationStatus === 'loading') {
    return <LoadingState label="Loading your workspace" />;
  }
  if (!user) return <Navigate to={APP_ROUTES.forbidden} replace />;

  if (
    isPlatformSession(user) ||
    hasPermission(user.authorization, 'dashboard.view', 'organization-or-department')
  ) {
    return <DashboardPage />;
  }

  const firstAllowedPath = getFirstNavigationPath(getVisibleNavigation(user, authorizationStatus));
  return <Navigate to={firstAllowedPath ?? APP_ROUTES.forbidden} replace />;
}

export default App;
