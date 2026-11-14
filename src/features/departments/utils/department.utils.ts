import {
  hasDepartmentPermission,
  hasOrganizationPermission,
} from '@/features/authorization/permissions';
import type { AuthenticatedUser } from '@/features/auth/types/auth.types';
import type {
  DepartmentFormErrors,
  DepartmentFormValues,
} from '@/features/departments/types/department.types';

export function isDepartmentId(value: string): boolean {
  return /^[a-f\d]{24}$/i.test(value);
}

export function canViewDepartment(user: AuthenticatedUser, departmentId: string): boolean {
  return (
    hasOrganizationPermission(user.authorization, 'departments.view') ||
    hasDepartmentPermission(user.authorization, 'departments.view', departmentId)
  );
}

export function canEditDepartment(user: AuthenticatedUser, departmentId: string): boolean {
  return (
    hasOrganizationPermission(user.authorization, 'departments.edit') ||
    hasDepartmentPermission(user.authorization, 'departments.edit', departmentId)
  );
}

export function validateDepartmentForm(values: DepartmentFormValues): DepartmentFormErrors {
  const errors: DepartmentFormErrors = {};
  const nameLength = values.name.trim().length;

  if (nameLength < 2 || nameLength > 200) {
    errors.name = 'Department name must be between 2 and 200 characters.';
  }
  if (values.description.trim().length > 1000) {
    errors.description = 'Description cannot exceed 1000 characters.';
  }

  return errors;
}

export function formatDepartmentDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
