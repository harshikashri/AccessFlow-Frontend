import type {
  PermissionCatalogModule,
  RoleFormErrors,
  RoleFormValues,
} from '@/features/roles/types/role.types';
import type { UserRole } from '@/features/users/types/user.types';
import type { PermissionId } from '@/features/authorization/permission-catalog';

const roleNameMinLength = 2;
const roleNameMaxLength = 200;
const roleDescriptionMaxLength = 1000;

export function isBuiltInRole(role: Pick<UserRole, 'roleType'>): boolean {
  return role.roleType !== 'CUSTOM';
}

export function isRoleId(value: string): boolean {
  return /^[a-f\d]{24}$/i.test(value);
}

export function canEditRolePermissions(role: Pick<UserRole, 'roleType'>): boolean {
  return role.roleType === 'CUSTOM' || role.roleType === 'DEPARTMENT_MANAGER';
}

export function validateRoleForm(values: RoleFormValues): RoleFormErrors {
  const errors: RoleFormErrors = {};
  const name = values.name.trim();
  const description = values.description.trim();

  if (name.length < roleNameMinLength || name.length > roleNameMaxLength) {
    errors.name = `Role name must be between ${roleNameMinLength} and ${roleNameMaxLength} characters.`;
  }
  if (description.length > roleDescriptionMaxLength) {
    errors.description = `Description cannot exceed ${roleDescriptionMaxLength} characters.`;
  }

  return errors;
}

export function togglePermission(
  selected: readonly PermissionId[],
  permissionId: PermissionId,
): PermissionId[] {
  return selected.includes(permissionId)
    ? selected.filter((permission) => permission !== permissionId)
    : [...selected, permissionId];
}

export function togglePermissionModule(
  selected: readonly PermissionId[],
  permissions: readonly PermissionId[],
): PermissionId[] {
  const selectedSet = new Set(selected);
  const allSelected = permissions.every((permission) => selectedSet.has(permission));
  if (allSelected) {
    return selected.filter((permission) => !permissions.includes(permission));
  }
  return [...new Set([...selected, ...permissions])];
}

export function arePermissionsEqual(
  left: readonly PermissionId[],
  right: readonly PermissionId[],
): boolean {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((permission) => rightSet.has(permission));
}

export function filterPermissionModules(
  modules: readonly PermissionCatalogModule[],
  search: string,
): PermissionCatalogModule[] {
  const normalizedSearch = search.trim().toLocaleLowerCase();
  if (!normalizedSearch) return [...modules];

  return modules
    .map((module) => ({
      ...module,
      permissions: module.permissions.filter((permission) =>
        [permission.id, permission.name, permission.description, module.name]
          .join(' ')
          .toLocaleLowerCase()
          .includes(normalizedSearch),
      ),
    }))
    .filter((module) => module.permissions.length > 0);
}
