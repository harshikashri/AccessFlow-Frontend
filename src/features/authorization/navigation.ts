import type { AuthenticatedUser } from '@/features/auth/types/auth.types';
import type { AuthorizationStatus } from '@/features/auth/types/auth.types';
import { hasAllPermissions, hasAnyPermission, isAuthorizationInfo } from './permissions';
import type { NavigationItem, NavigationRequirement, NavigationSection } from './navigation.config';
import { NAVIGATION_SECTIONS } from './navigation.config';

export function isPlatformSession(user: AuthenticatedUser | null | undefined): boolean {
  return user?.platformRole === 'SUPER_ADMIN';
}

function canAccessRequirement(
  user: AuthenticatedUser | null | undefined,
  requirement: NavigationRequirement | undefined,
): boolean {
  if (!user || !isAuthorizationInfo(user.authorization)) return false;
  if (!requirement) return false;
  if (requirement.kind === 'platform-session') return isPlatformSession(user);
  if (isPlatformSession(user)) return false;

  const check = requirement.mode === 'all' ? hasAllPermissions : hasAnyPermission;
  return check(user.authorization, requirement.permissions, requirement.scope);
}

export function canAccessNavigationItem(
  user: AuthenticatedUser | null | undefined,
  item: NavigationItem,
): boolean {
  const hasOwnAccess = canAccessRequirement(user, item.requirement);
  const hasVisibleChild =
    item.children?.some((child) => canAccessNavigationItem(user, child)) ?? false;
  return hasOwnAccess || hasVisibleChild;
}

function filterNavigationItem(
  user: AuthenticatedUser,
  item: NavigationItem,
): NavigationItem | null {
  const children = item.children
    ?.map((child) => filterNavigationItem(user, child))
    .filter((child): child is NavigationItem => child !== null);
  const filtered = children ? { ...item, children } : item;
  return canAccessNavigationItem(user, filtered) ? filtered : null;
}

export function getVisibleNavigation(
  user: AuthenticatedUser | null | undefined,
  authorizationStatus: AuthorizationStatus,
): NavigationSection[] {
  if (authorizationStatus !== 'available' || !user || !isAuthorizationInfo(user.authorization)) {
    return [];
  }

  const sections = isPlatformSession(user)
    ? NAVIGATION_SECTIONS.filter((section) => section.id === 'platform')
    : NAVIGATION_SECTIONS.filter((section) => section.id !== 'platform');

  return sections
    .map((section) => ({
      ...section,
      items: section.items
        .map((item) => filterNavigationItem(user, item))
        .filter((item): item is NavigationItem => item !== null),
    }))
    .filter((section) => section.items.length > 0);
}

export function findNavigationItem(itemId: string): NavigationItem | undefined {
  const visit = (item: NavigationItem): NavigationItem | undefined => {
    if (item.id === itemId) return item;
    for (const child of item.children ?? []) {
      const match = visit(child);
      if (match) return match;
    }
    return undefined;
  };

  for (const section of NAVIGATION_SECTIONS) {
    for (const item of section.items) {
      const match = visit(item);
      if (match) return match;
    }
  }
  return undefined;
}

export function findVisibleNavigationItem(
  sections: readonly NavigationSection[],
  pathname: string,
): NavigationItem | undefined {
  const visit = (item: NavigationItem): NavigationItem | undefined => {
    if (item.path === pathname) return item;
    for (const child of item.children ?? []) {
      const match = visit(child);
      if (match) return match;
    }
    return undefined;
  };

  for (const section of sections) {
    for (const item of section.items) {
      const match = visit(item);
      if (match) return match;
    }
  }
  return undefined;
}

export function getFirstNavigationPath(sections: readonly NavigationSection[]): string | null {
  const findPath = (items: readonly NavigationItem[]): string | null => {
    for (const item of items) {
      if (item.path) return item.path;
      const childPath = findPath(item.children ?? []);
      if (childPath) return childPath;
    }
    return null;
  };

  for (const section of sections) {
    const path = findPath(section.items);
    if (path) return path;
  }
  return null;
}
