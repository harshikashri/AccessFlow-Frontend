import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { AppIcon } from '@/components/common/AppIcon';
import { Button, Card } from '@/components/ui';
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

  const departmentIds = Object.keys(user.authorization.departmentPermissions);

  return (
    <div className="workspace-page">
      <PageHeader
        eyebrow="Account"
        title="My profile"
        description="Profile and access details returned for your authenticated session."
        actions={
          <Button
            variant="outline"
            leadingIcon={
              <span className={refreshing ? 'workspace-refresh--spinning' : ''}>
                <AppIcon name="refresh" size={16} />
              </span>
            }
            loading={refreshing}
            onClick={() => void handleRefresh()}
          >
            Refresh access
          </Button>
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
          <div>
            <dt>Platform role</dt>
            <dd>{isPlatformSession(user) ? 'Super Admin' : 'Not provided'}</dd>
          </div>
          <div>
            <dt>Organization context</dt>
            <dd>{user.organizationId ?? 'No organization context'}</dd>
          </div>
          <div>
            <dt>Department permission scopes</dt>
            <dd>
              {departmentIds.length
                ? departmentIds.join(', ')
                : 'No department-specific permissions'}
            </dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
