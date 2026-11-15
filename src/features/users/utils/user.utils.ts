import {
  hasDepartmentPermission,
  hasOrganizationPermission,
} from '@/features/authorization/permissions';
import type { PermissionId } from '@/features/authorization/permission-catalog';
import type { AuthenticatedUser } from '@/features/auth/types/auth.types';
import type {
  CreateUserRequest,
  CreateUserRoleAssignment,
  UserFormErrors,
  UserFormValues,
  UserRole,
  UserScopeType,
  UserStatus,
  UpdateUserRequest,
} from '@/features/users/types/user.types';

const objectIdPattern = /^[a-f\d]{24}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const nameMinLength = 2;
const nameMaxLength = 200;
const emailMaxLength = 320;
const maxRoleAssignments = 50;

export function isUserId(value: string): boolean {
  return objectIdPattern.test(value);
}

export function canViewUserScope(user: AuthenticatedUser, departmentId: string | null): boolean {
  return (
    hasOrganizationPermission(user.authorization, 'users.view') ||
    (departmentId !== null &&
      hasDepartmentPermission(user.authorization, 'users.view', departmentId))
  );
}

export function canEditUserScope(user: AuthenticatedUser, departmentId: string | null): boolean {
  return (
    hasOrganizationPermission(user.authorization, 'users.edit') ||
    (departmentId !== null &&
      hasDepartmentPermission(user.authorization, 'users.edit', departmentId))
  );
}

export function canManageUserMembership(
  user: AuthenticatedUser,
  departmentId: string | null,
): boolean {
  return (
    hasOrganizationPermission(user.authorization, 'users.deactivate') ||
    (departmentId !== null &&
      hasDepartmentPermission(user.authorization, 'users.deactivate', departmentId))
  );
}

export function canCreateUsers(user: AuthenticatedUser): boolean {
  return hasOrganizationPermission(user.authorization, 'users.create');
}

export function canAssignUserToDepartment(
  user: AuthenticatedUser,
  currentDepartmentId: string | null,
  targetDepartmentId: string | null,
): boolean {
  if (!canEditUserScope(user, currentDepartmentId)) return false;
  return targetDepartmentId === null || canEditUserScope(user, targetDepartmentId);
}

export function canAssignRoleAtScope(
  user: AuthenticatedUser,
  role: UserRole,
  scopeType: UserScopeType,
  departmentId: string | null,
): boolean {
  if (role.roleType === 'ORGANIZATION_ADMIN' && scopeType !== 'ORGANIZATION') return false;
  if (
    (role.roleType === 'DEPARTMENT_MANAGER' || role.rolePurpose === 'FINANCE_APPROVER') &&
    scopeType !== 'DEPARTMENT'
  ) {
    return false;
  }
  if (scopeType === 'DEPARTMENT' && !departmentId) return false;

  const hasPermission = (permission: PermissionId) =>
    hasOrganizationPermission(user.authorization, permission) ||
    (scopeType === 'DEPARTMENT' &&
      departmentId !== null &&
      hasDepartmentPermission(user.authorization, permission, departmentId));

  if (role.roleType === 'EMPLOYEE') {
    return (['roles.edit', 'users.create', 'users.edit'] as PermissionId[]).some(hasPermission);
  }
  if (role.roleType === 'DEPARTMENT_MANAGER') return hasPermission('roles.edit');
  return role.permissions.every(hasPermission);
}

export function isDuplicateRoleAssignment(
  assignments: readonly {
    roleId: string;
    scopeType: UserScopeType;
    departmentId: string | null;
    status?: UserStatus;
  }[],
  candidate: CreateUserRoleAssignment,
): boolean {
  return assignments.some(
    (assignment) =>
      assignment.status !== 'INACTIVE' &&
      assignment.roleId === candidate.roleId &&
      assignment.scopeType === candidate.scopeType &&
      assignment.departmentId === candidate.departmentId,
  );
}

export function getUserStatusLabel(
  accountStatus: UserStatus,
  passwordSetupRequired?: boolean,
): string {
  if (accountStatus === 'INACTIVE' && passwordSetupRequired === true) return 'Setup pending';
  return accountStatus === 'ACTIVE' ? 'Account active' : 'Account inactive';
}

export function validateUserForm(values: UserFormValues): UserFormErrors {
  const errors: UserFormErrors = {};
  const name = values.name.trim();
  const email = values.email.trim().toLowerCase();

  if (name.length < nameMinLength || name.length > nameMaxLength) {
    errors.name = `Name must be between ${nameMinLength} and ${nameMaxLength} characters.`;
  }
  if (!email || email.length > emailMaxLength || !emailPattern.test(email)) {
    errors.email = 'Enter a valid email address.';
  }
  if (values.departmentId && !isUserId(values.departmentId)) {
    errors.departmentId = 'Select a valid department.';
  }
  if (values.roleAssignments.length > maxRoleAssignments) {
    errors.roleAssignments = `No more than ${maxRoleAssignments} role assignments can be added.`;
  } else {
    const seen = new Set<string>();
    for (const assignment of values.roleAssignments) {
      if (!isUserId(assignment.roleId)) {
        errors.roleAssignments = 'Select a valid role.';
        break;
      }
      if (
        assignment.scopeType === 'DEPARTMENT' &&
        (!assignment.departmentId || !isUserId(assignment.departmentId))
      ) {
        errors.roleAssignments = 'Select a valid department for each department-scoped role.';
        break;
      }
      if (assignment.scopeType === 'ORGANIZATION' && assignment.departmentId !== null) {
        errors.roleAssignments = 'Organization-scoped roles cannot include a department.';
        break;
      }
      const key = `${assignment.roleId}:${assignment.scopeType}:${assignment.departmentId ?? ''}`;
      if (seen.has(key)) {
        errors.roleAssignments = 'The same role cannot be assigned twice at the same scope.';
        break;
      }
      seen.add(key);
    }
  }

  return errors;
}

export function createUserPayload(values: UserFormValues): CreateUserRequest {
  return {
    name: values.name.trim(),
    email: values.email.trim().toLowerCase(),
    ...(values.departmentId ? { departmentId: values.departmentId } : {}),
    ...(values.roleAssignments.length > 0
      ? {
          roleAssignments: values.roleAssignments.map(({ roleId, scopeType, departmentId }) => ({
            roleId,
            scopeType,
            ...(departmentId ? { departmentId } : {}),
          })),
        }
      : {}),
  };
}

export function updateUserPayload(
  values: Pick<UserFormValues, 'name' | 'email'>,
  original: Pick<UserFormValues, 'name' | 'email'>,
): UpdateUserRequest {
  const payload: UpdateUserRequest = {};
  const name = values.name.trim();
  const email = values.email.trim().toLowerCase();
  if (name !== original.name) payload.name = name;
  if (email !== original.email.toLowerCase()) payload.email = email;
  return payload;
}

export function roleAssignmentIdentity(assignment: {
  roleId: string;
  scopeType: UserScopeType;
  departmentId: string | null;
}): string {
  return `${assignment.roleId}:${assignment.scopeType}:${assignment.departmentId ?? ''}`;
}
