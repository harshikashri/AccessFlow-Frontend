import { Badge, Card } from '@/components/ui';
import { RoleStatusBadge } from '@/features/roles/components/RoleStatusBadge';
import { RoleTypeBadge } from '@/features/roles/components/RoleTypeBadge';
import type { ManagedRole } from '@/features/roles/types/role.types';
import { getRoleSupportedScopes } from '@/features/roles/utils/role.utils';

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
    : '—';
}

export function RoleOverview({ role }: { role: ManagedRole }) {
  const supportedScopes = getRoleSupportedScopes(role);
  return (
    <Card title="Role overview" description={role.description || 'No description provided.'}>
      <dl className="role-overview">
        <div>
          <dt>Role type</dt>
          <dd>
            <RoleTypeBadge roleType={role.roleType} />
          </dd>
        </div>
        <div>
          <dt>Purpose</dt>
          <dd>{role.rolePurpose === 'FINANCE_APPROVER' ? 'Finance Approver' : 'General'}</dd>
        </div>
        <div>
          <dt>Supported assignment scopes</dt>
          <dd>
            {supportedScopes.length ? (
              supportedScopes.map((scope) => (
                <Badge key={scope} variant="information">
                  {scope === 'ORGANIZATION' ? 'Organization' : 'Department'}
                </Badge>
              ))
            ) : (
              <Badge variant="warning">Unconfigured</Badge>
            )}
          </dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            <RoleStatusBadge status={role.status} />
          </dd>
        </div>
        <div>
          <dt>Permissions</dt>
          <dd>{role.permissions.length}</dd>
        </div>
        <div>
          <dt>Active assignments</dt>
          <dd>
            <Badge variant="information">{role.assignmentCount}</Badge>
          </dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{formatDate(role.createdAt)}</dd>
        </div>
        <div>
          <dt>Last updated</dt>
          <dd>{formatDate(role.updatedAt)}</dd>
        </div>
      </dl>
      {role.roleType === 'CUSTOM' && supportedScopes.length === 0 && (
        <p className="role-overview__scope-note">
          This legacy custom role must be edited to choose supported assignment scopes before it can
          be assigned to users.
        </p>
      )}
    </Card>
  );
}
