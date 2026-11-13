import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Button } from '@/components/ui';
import { useToast } from '@/components/ui/useToast';
import { useAuth } from '@/features/auth/context/useAuth';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { getVisibleNavigation } from '@/features/authorization/navigation';
import { isAuthorizationInfo } from '@/features/authorization/permissions';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import {
  WorkspaceBrand,
  WorkspaceBreadcrumbs,
  WorkspaceHeaderActions,
} from '@/layouts/WorkspaceHeader';
import { WorkspaceNavigation } from '@/layouts/WorkspaceNavigation';
import { APP_ROUTES } from '@/routes/route.constants';

export function WorkspaceLayout() {
  const { authorizationStatus, error, logout, refreshCurrentUser, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (authorizationStatus === 'loading') {
    return <LoadingState label="Loading your access information" />;
  }

  if (authorizationStatus !== 'available' || !user || !isAuthorizationInfo(user.authorization)) {
    const retry = async () => {
      setActionError(null);
      try {
        await refreshCurrentUser();
      } catch (retryError) {
        const detail = getAuthErrorMessage(
          retryError,
          'We could not verify your access. Please try again.',
        );
        setActionError(detail);
        showToast({ title: 'Unable to verify access', description: detail, variant: 'error' });
      }
    };
    const signOut = async () => {
      setActionError(null);
      try {
        await logout();
        navigate(APP_ROUTES.signIn, { replace: true });
      } catch (logoutError) {
        const detail = getAuthErrorMessage(
          logoutError,
          'We could not sign you out. Please try again.',
        );
        setActionError(detail);
        showToast({ title: 'Unable to sign out', description: detail, variant: 'error' });
      }
    };

    return (
      <main className="workspace-unavailable">
        <ErrorState
          title="Access could not be verified"
          description={error ?? 'Protected pages are hidden until access can be verified.'}
          action={
            <div className="workspace-unavailable__actions">
              <Button variant="primary" onClick={() => void retry()}>
                Try again
              </Button>
              <Button variant="outline" onClick={() => void signOut()}>
                Sign out
              </Button>
              {actionError && <p role="alert">{actionError}</p>}
            </div>
          }
        />
      </main>
    );
  }

  const sections = getVisibleNavigation(user, authorizationStatus);

  return (
    <DashboardLayout
      sidebarBrand={<WorkspaceBrand />}
      sidebar={<WorkspaceNavigation sections={sections} collapsed={sidebarCollapsed} />}
      sidebarFooter={<span className="workspace-sidebar-footer">Secure workspace</span>}
      sidebarCollapsed={sidebarCollapsed}
      onSidebarCollapsedChange={setSidebarCollapsed}
      title={<WorkspaceBreadcrumbs />}
      headerActions={<WorkspaceHeaderActions />}
    />
  );
}
