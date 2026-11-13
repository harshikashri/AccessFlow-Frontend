import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AppIcon } from '@/components/common/AppIcon';
import { Avatar, DropdownMenu } from '@/components/ui';
import { useToast } from '@/components/ui/useToast';
import { appConfig } from '@/config/app.config';
import { useAuth } from '@/features/auth/context/useAuth';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import {
  getVisibleNavigation,
  findVisibleNavigationItem,
  isPlatformSession,
} from '@/features/authorization/navigation';
import { APP_ROUTES } from '@/routes/route.constants';

export function WorkspaceBreadcrumbs() {
  const { user, authorizationStatus } = useAuth();
  const location = useLocation();
  const sections = getVisibleNavigation(user, authorizationStatus);
  const currentItem = findVisibleNavigationItem(sections, location.pathname);
  const fallbackLabels: Record<string, string> = {
    [APP_ROUTES.profile]: 'My profile',
    [APP_ROUTES.settings]: 'Account settings',
    [APP_ROUTES.forbidden]: 'Access denied',
  };
  const label = currentItem?.label ?? fallbackLabels[location.pathname] ?? 'Page not found';

  return (
    <nav className="workspace-breadcrumbs" aria-label="Breadcrumb">
      <ol>
        <li>
          <Link to={APP_ROUTES.root}>{appConfig.name}</Link>
        </li>
        {currentItem?.section && <li aria-hidden="true">{currentItem.section}</li>}
        <li aria-current="page">{label}</li>
      </ol>
    </nav>
  );
}

function NotificationsEntry() {
  return (
    <details className="workspace-notifications">
      <summary aria-label="Notifications">
        <AppIcon name="bell" size={19} />
      </summary>
      <div className="workspace-notifications__panel" role="region" aria-label="Notifications">
        <h2>Notifications</h2>
        <p>Notifications are not available yet.</p>
      </div>
    </details>
  );
}

function ProfileMenu() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [logoutError, setLogoutError] = useState<string | null>(null);

  if (!user) return null;

  async function handleLogout() {
    setLogoutError(null);
    try {
      await logout();
      navigate(APP_ROUTES.signIn, { replace: true });
    } catch (error) {
      const message = getAuthErrorMessage(error, 'We could not sign you out. Please try again.');
      setLogoutError(message);
      showToast({ title: 'Unable to sign out', description: message, variant: 'error' });
    }
  }

  const items = [
    { label: 'My profile', onSelect: () => navigate(APP_ROUTES.profile) },
    { label: 'Account settings', onSelect: () => navigate(APP_ROUTES.settings) },
    { label: 'Sign out', onSelect: () => void handleLogout(), destructive: true },
  ];

  return (
    <div className="workspace-profile">
      <DropdownMenu
        label="Account menu"
        align="end"
        trigger={
          <span className="workspace-profile__trigger">
            <Avatar name={user.name} size="sm" />
            <span className="workspace-profile__details">
              <span className="workspace-profile__name">{user.name}</span>
              <span className="workspace-profile__email">{user.email}</span>
            </span>
          </span>
        }
        items={items}
      />
      {logoutError && (
        <span className="sr-only" role="alert">
          {logoutError}
        </span>
      )}
    </div>
  );
}

export function WorkspaceHeaderActions() {
  return (
    <div className="workspace-header__actions">
      <NotificationsEntry />
      <ProfileMenu />
    </div>
  );
}

export function WorkspaceBrand() {
  const { user } = useAuth();

  return (
    <Link to={APP_ROUTES.root} className="workspace-brand" aria-label={`${appConfig.name} home`}>
      <span className="workspace-brand__mark" aria-hidden="true">
        A
      </span>
      <span className="workspace-brand__name">{appConfig.name}</span>
      {user && isPlatformSession(user) && (
        <span className="workspace-brand__context">Platform</span>
      )}
    </Link>
  );
}
