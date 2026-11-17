import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { IconButton } from '@/components/common/IconButton';
import { Card } from '@/components/ui';
import { useToast } from '@/components/ui/useToast';
import { useAuth } from '@/features/auth/context/useAuth';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { isPlatformSession } from '@/features/authorization/navigation';

export function ProfilePage() {
  const { user, refreshCurrentUser } = useAuth();
  const { showToast } = useToast();
  const [refreshing, setRefreshing] = useState(false);

  if (!user) return null;

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refreshCurrentUser();
      showToast({ title: 'Access information refreshed', variant: 'success' });
    } catch (error) {
      showToast({
        title: 'Could not refresh access',
        description: getAuthErrorMessage(error, 'Try again when your connection is available.'),
        variant: 'error',
      });
    } finally {
      setRefreshing(false);
    }
  }

  const permissions = [
    ...new Set([
      ...user.authorization.organizationPermissions,
      ...Object.values(user.authorization.departmentPermissions).flat(),
    ]),
  ];
  const rolePermissions = user.authorization.rolePermissions;
  const isPlatformAdmin = isPlatformSession(user);

  return (
    <div className="workspace-page">
      <PageHeader
        eyebrow="Account"
        title="My profile"
        description="Profile and access details returned for your authenticated session."
        actions={
          <IconButton
            variant="outline"
            icon="refresh"
            label="Refresh access"
            className={refreshing ? 'workspace-refresh--spinning' : ''}
            loading={refreshing}
            onClick={() => void handleRefresh()}
          />
        }
      />
      <Card
        title="Profile details"
        description="This information comes from your current session profile."
      >
        <dl className="workspace-profile-details">
          <div>
            <dt>Full name</dt>
            <dd>{user.name}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
          {isPlatformAdmin && (
            <div>
              <dt>Platform role</dt>
              <dd>Super Admin</dd>
            </div>
          )}
          {isPlatformAdmin && (
            <div>
              <dt>Organization context</dt>
              <dd>{user.organizationId ?? 'No organization context'}</dd>
            </div>
          )}
          {rolePermissions?.length ? (
            <div>
              <dt>Permissions by role</dt>
              <dd>
                <ul className="workspace-profile-role-permissions">
                  {rolePermissions.map((rolePermission, index) => (
                    <li key={`${rolePermission.roleName}-${rolePermission.scopeType}-${index}`}>
                      <strong>{rolePermission.roleName}</strong>
                      <span>
                        {' '}
                        (
                        {rolePermission.scopeType === 'ORGANIZATION'
                          ? 'Organization scope'
                          : 'Department scope'}
                        )
                      </span>
                      <p>
                        {rolePermission.permissions.length
                          ? rolePermission.permissions.join(', ')
                          : 'No permissions assigned'}
                      </p>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          ) : (
            <div>
              <dt>Permissions</dt>
              <dd>{permissions.length ? permissions.join(', ') : 'No permissions assigned'}</dd>
            </div>
          )}
        </dl>
      </Card>
    </div>
  );
}
