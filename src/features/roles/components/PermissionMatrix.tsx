import { useEffect, useMemo, useState } from 'react';
import { Checkbox, Input } from '@/components/ui';
import type { PermissionCatalogModule } from '@/features/roles/types/role.types';
import type { PermissionId } from '@/features/authorization/permission-catalog';
import {
  filterPermissionModules,
  togglePermission,
  togglePermissionModule,
} from '@/features/roles/utils/role.utils';

interface PermissionMatrixProps {
  modules: PermissionCatalogModule[];
  value: PermissionId[];
  onChange?: (permissions: PermissionId[]) => void;
  readOnly?: boolean;
}

export function PermissionMatrix({
  modules,
  value,
  onChange,
  readOnly = false,
}: PermissionMatrixProps) {
  const [search, setSearch] = useState('');
  const [expandedModules, setExpandedModules] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    setExpandedModules(new Set());
  }, [modules]);
  const filteredModules = useMemo(
    () => filterPermissionModules(modules, search),
    [modules, search],
  );
  const selected = new Set(value);

  function updatePermission(permissionId: PermissionId) {
    onChange?.(togglePermission(value, permissionId));
  }

  function updateModule(permissions: PermissionId[]) {
    onChange?.(togglePermissionModule(value, permissions));
  }

  return (
    <section className="permission-matrix" aria-label="Role permissions">
      <div className="permission-matrix__toolbar">
        <div>
          <h2>Permissions</h2>
          <p>{value.length} selected</p>
        </div>
        <Input
          label="Search permissions"
          name="permissionSearch"
          type="search"
          placeholder="Search by name or description"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      {filteredModules.length === 0 ? (
        <p className="permission-matrix__empty">No permissions match your search.</p>
      ) : (
        <div className="permission-matrix__groups">
          {filteredModules.map((module) => {
            const permissionIds = module.permissions.map((permission) => permission.id);
            const selectedCount = permissionIds.filter((id) => selected.has(id)).length;
            const isExpanded = expandedModules.has(module.id);
            return (
              <section className="permission-group" key={module.id}>
                <header className="permission-group__header">
                  {!readOnly && (
                    <Checkbox
                      label={`Select all ${module.name}`}
                      checked={permissionIds.length > 0 && selectedCount === permissionIds.length}
                      indeterminate={selectedCount > 0 && selectedCount < permissionIds.length}
                      disabled={permissionIds.length === 0}
                      onChange={() => updateModule(permissionIds)}
                    />
                  )}
                  {readOnly && <strong className="permission-group__title">{module.name}</strong>}
                  <span className="permission-group__count">
                    {selectedCount} of {permissionIds.length} selected
                  </span>
                  <button
                    className="permission-group__toggle"
                    type="button"
                    aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${module.name} permissions`}
                    aria-expanded={isExpanded}
                    onClick={() =>
                      setExpandedModules((current) => {
                        const next = new Set(current);
                        if (next.has(module.id)) next.delete(module.id);
                        else next.add(module.id);
                        return next;
                      })
                    }
                  >
                    {isExpanded ? 'Collapse' : 'Expand'}
                  </button>
                </header>
                {isExpanded && (
                  <div className="permission-group__items">
                    {module.permissions.map((permission) => (
                      <div className="permission-item" key={permission.id}>
                        <Checkbox
                          label={permission.name}
                          checked={selected.has(permission.id)}
                          disabled={readOnly}
                          helperText={permission.description}
                          onChange={() => updatePermission(permission.id)}
                        />
                        <code>{permission.id}</code>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
