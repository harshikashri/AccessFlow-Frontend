import type { AuthenticatedUser } from '@/features/auth/types/auth.types';
import { isAuthorizationInfo } from '@/features/authorization/permissions';

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function isAuthenticatedUser(value: unknown): value is AuthenticatedUser {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.email !== 'string' ||
    !(value.platformRole === null || value.platformRole === 'SUPER_ADMIN') ||
    !(value.organizationId === null || typeof value.organizationId === 'string') ||
    !isAuthorizationInfo(value.authorization)
  ) {
    return false;
  }

  if (value.platformRole === 'SUPER_ADMIN') {
    return (
      value.organizationId === null &&
      value.authorization.organizationPermissions.length === 0 &&
      Object.keys(value.authorization.departmentPermissions).length === 0
    );
  }

  return typeof value.organizationId === 'string' && value.organizationId.length > 0;
}
