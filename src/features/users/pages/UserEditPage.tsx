import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Button } from '@/components/ui';
import { useToast } from '@/components/ui/useToast';
import { useAuth } from '@/features/auth/context/useAuth';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { hasPermission } from '@/features/authorization/permissions';
import { UserForm } from '@/features/users/components/UserForm';
import { useUpdateUser, useUserDetails } from '@/features/users/hooks/useUsers';
import type { UpdateUserRequest, UserFormValues } from '@/features/users/types/user.types';
import { canEditUserScope, canViewUserScope, isUserId } from '@/features/users/utils/user.utils';
import { APP_ROUTES } from '@/routes/route.constants';

export function UserEditPage() {
  const { user, authorizationStatus } = useAuth();
  const { userId = '' } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const organizationId = user?.organizationId ?? '';
  const hasScope = Boolean(
    user &&
    hasPermission(user.authorization, 'users.view', 'organization-or-department') &&
    hasPermission(user.authorization, 'users.edit', 'organization-or-department'),
  );
  const isValidUserId = isUserId(userId);
  const detailsQuery = useUserDetails(
    hasScope ? (user?.id ?? '') : '',
    hasScope ? organizationId : '',
    userId,
    hasScope && isValidUserId,
  );
  const updateUser = useUpdateUser(user?.id ?? '', organizationId, userId);

  if (authorizationStatus === 'loading') {
    return <LoadingState label="Checking user access" />;
  }
  if (
    authorizationStatus !== 'available' ||
    !user ||
    !organizationId ||
    user.platformRole === 'SUPER_ADMIN' ||
    !hasScope ||
    !isValidUserId
  ) {
    return <Navigate to={APP_ROUTES.forbidden} replace />;
  }
  if (detailsQuery.isPending) {
    return <LoadingState label="Loading user details" />;
  }
  if (detailsQuery.isError || !detailsQuery.data) {
    return (
      <div className="workspace-page user-page">
        <ErrorState
          title="User could not be loaded"
          description={getAuthErrorMessage(detailsQuery.error, 'The user profile is unavailable.')}
          action={
            <Button variant="outline" onClick={() => void detailsQuery.refetch()}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  const targetUser = detailsQuery.data;
  if (
    !canViewUserScope(user, targetUser.membership.departmentId) ||
    !canEditUserScope(user, targetUser.membership.departmentId)
  ) {
    return <Navigate to={APP_ROUTES.forbidden} replace />;
  }
  const actor = user;
  const initialValues: UserFormValues = {
    name: targetUser.name,
    email: targetUser.email,
    departmentId: '',
    roleAssignments: [],
  };

  async function submit(payload: UpdateUserRequest) {
    try {
      await updateUser.mutateAsync(payload);
      showToast({
        title: 'User updated',
        description: `${targetUser.name}'s profile was updated.`,
        variant: 'success',
      });
      navigate(`${APP_ROUTES.users}/${targetUser.id}`, { replace: true });
    } catch (error) {
      showToast({
        title: 'User was not updated',
        description: getAuthErrorMessage(error, 'The user profile could not be updated.'),
        variant: 'error',
      });
    }
  }

  return (
    <div className="workspace-page user-page">
      <nav className="user-breadcrumb" aria-label="Breadcrumb">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`${APP_ROUTES.users}/${targetUser.id}`)}
        >
          {targetUser.name}
        </Button>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Edit</span>
      </nav>
      <PageHeader
        eyebrow="Users"
        title="Edit user"
        description="Update the user's name or email address."
        actions={
          <Button
            variant="outline"
            onClick={() => navigate(`${APP_ROUTES.users}/${targetUser.id}`)}
          >
            Cancel
          </Button>
        }
      />
      <UserForm
        mode="edit"
        actor={actor}
        initialValues={initialValues}
        departments={[]}
        roles={[]}
        isSubmitting={updateUser.isPending}
        onCancel={() => navigate(`${APP_ROUTES.users}/${targetUser.id}`)}
        onSubmit={submit}
      />
    </div>
  );
}
