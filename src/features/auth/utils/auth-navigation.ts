import { APP_ROUTES } from '@/routes/route.constants';

export function getAuthReturnPath(state: unknown): string {
  if (!state || typeof state !== 'object' || !('from' in state)) {
    return APP_ROUTES.root;
  }

  const from = (state as { from?: unknown }).from;
  if (!from || typeof from !== 'object' || !('pathname' in from)) {
    return APP_ROUTES.root;
  }

  const location = from as { pathname?: unknown; search?: unknown; hash?: unknown };
  if (
    typeof location.pathname !== 'string' ||
    !location.pathname.startsWith('/') ||
    location.pathname.startsWith('//')
  ) {
    return APP_ROUTES.root;
  }

  return `${location.pathname}${typeof location.search === 'string' ? location.search : ''}${typeof location.hash === 'string' ? location.hash : ''}`;
}
