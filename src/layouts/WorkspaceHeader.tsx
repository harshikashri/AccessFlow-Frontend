import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AppIcon } from '@/components/common/AppIcon';
import { BrandMark } from '@/components/common/BrandMark';
import { DropdownMenu } from '@/components/ui';
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

function getNestedRouteBreadcrumb(
  pathname: string,
): { section: string; label: string } | undefined {
  if (pathname.startsWith(`${APP_ROUTES.requests}/`) && pathname !== APP_ROUTES.newRequest) {
    return {
      section: 'Requests',
      label: pathname.endsWith('/edit') ? 'Edit request' : 'Request details',
    };
  }
  if (
    pathname.startsWith(`${APP_ROUTES.approvals}/`) &&
    pathname !== APP_ROUTES.approvalDelegation
  ) {
    return { section: 'Requests', label: 'Approval details' };
  }
  if (pathname.startsWith(`${APP_ROUTES.departments}/`) && pathname !== APP_ROUTES.newDepartment) {
    return {
      section: 'Organization',
      label: pathname.endsWith('/edit') ? 'Edit department' : 'Department details',
    };
  }
  if (pathname.startsWith(`${APP_ROUTES.users}/`) && pathname !== APP_ROUTES.newUser) {
    return {
      section: 'Organization',
      label: pathname.endsWith('/edit') ? 'Edit user' : 'User details',
    };
  }
  return undefined;
}

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
  const organizationRouteLabel =
    location.pathname === APP_ROUTES.organizations
      ? 'Organizations'
      : location.pathname.startsWith(`${APP_ROUTES.organizations}/`)
        ? 'Organization details'
        : undefined;
  const workflowRouteLabel =
    location.pathname === APP_ROUTES.workflows
      ? 'Workflows'
      : location.pathname.startsWith(`${APP_ROUTES.workflows}/`)
        ? 'Workflow details'
        : undefined;
  const nestedRouteBreadcrumb = getNestedRouteBreadcrumb(location.pathname);
  const label =
    currentItem?.label ??
    fallbackLabels[location.pathname] ??
    nestedRouteBreadcrumb?.label ??
    organizationRouteLabel ??
    workflowRouteLabel ??
    'Page not found';

  return (
    <nav className="workspace-breadcrumbs" aria-label="Breadcrumb">
      <ol>
        <li>
          <Link to={APP_ROUTES.root}>{appConfig.name}</Link>
        </li>
        {(currentItem?.section ?? nestedRouteBreadcrumb?.section) && (
          <li aria-hidden="true">{currentItem?.section ?? nestedRouteBreadcrumb?.section}</li>
        )}
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

export function WorkspaceSidebarAccountActions() {
  const { logout, logoutAll } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  async function handleSignOut(allDevices: boolean) {
    setActionError(null);
    setOpen(false);
    try {
      if (allDevices) {
        await logoutAll();
      } else {
        await logout();
      }
      navigate(APP_ROUTES.signIn, { replace: true });
    } catch (error) {
      const message = getAuthErrorMessage(error, 'We could not sign you out. Please try again.');
      setActionError(message);
      setOpen(true);
      showToast({
        title: allDevices ? 'Unable to log out of all devices' : 'Unable to sign out',
        description: message,
        variant: 'error',
      });
    }
  }

  return (
    <div
      className="workspace-sidebar-actions"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={(event) => {
        if (
          !(document.activeElement instanceof Node) ||
          !event.currentTarget.contains(document.activeElement)
        ) {
          setOpen(false);
        }
      }}
      onFocus={() => setOpen(true)}
      onBlur={(event) => {
        if (
          !(event.relatedTarget instanceof Node) ||
          !event.currentTarget.contains(event.relatedTarget)
        ) {
          setOpen(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          triggerRef.current?.focus();
          setOpen(false);
        } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          const menuItems =
            menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
          if (!menuItems?.length) return;
          event.preventDefault();
          const activeIndex = Array.from(menuItems).findIndex(
            (item) => item === document.activeElement,
          );
          const direction = event.key === 'ArrowDown' ? 1 : -1;
          const nextIndex =
            activeIndex < 0
              ? direction > 0
                ? 0
                : menuItems.length - 1
              : (activeIndex + direction + menuItems.length) % menuItems.length;
          menuItems[nextIndex]?.focus();
        }
      }}
    >
      <button
        ref={triggerRef}
        className="workspace-sidebar-actions__trigger"
        type="button"
        aria-label="Sign out options"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Sign out options"
        onClick={() => setOpen((current) => !current)}
      >
        <AppIcon name="logout" size={19} />
      </button>
      {open && (
        <div
          ref={menuRef}
          className="workspace-sidebar-actions__menu"
          role="menu"
          aria-label="Sign out options"
        >
          <button type="button" role="menuitem" onClick={() => void handleSignOut(false)}>
            Log out
          </button>
          <button type="button" role="menuitem" onClick={() => void handleSignOut(true)}>
            Log out of all devices
          </button>
          {actionError && <p role="alert">{actionError}</p>}
        </div>
      )}
    </div>
  );
}

function ProfileMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  if (!user) return null;

  async function handleSignOut() {
    try {
      await logout();
      navigate(APP_ROUTES.signIn, { replace: true });
    } catch (error) {
      const message = getAuthErrorMessage(error, 'We could not sign you out. Please try again.');
      showToast({
        title: 'Unable to sign out',
        description: message,
        variant: 'error',
      });
    }
  }

  const items = [
    { label: 'My profile', onSelect: () => navigate(APP_ROUTES.profile) },
    { label: 'Account settings', onSelect: () => navigate(APP_ROUTES.settings) },
    {
      label: 'Log out',
      destructive: true,
      onSelect: () => void handleSignOut(),
    },
  ];

  return (
    <div className="workspace-profile">
      <DropdownMenu
        label="Account menu"
        align="end"
        triggerLabel="Open profile menu"
        showChevron={false}
        trigger={<AppIcon name="profile" size={20} />}
        items={items}
      />
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
      <BrandMark />
      <span className="workspace-brand__name">{appConfig.name}</span>
      {user && isPlatformSession(user) && (
        <span className="workspace-brand__context">Platform</span>
      )}
    </Link>
  );
}
