import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Alert, Button } from '@/components/ui';
import { useToast } from '@/components/ui/useToast';
import { useAuth } from '@/features/auth/context/useAuth';
import { getAuthError, getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { hasOrganizationPermission, hasPermission } from '@/features/authorization/permissions';
import { UserForm } from '@/features/users/components/UserForm';
import {
  useCreateUser,
  useUserDepartmentOptions,
  useUserRoleCatalog,
} from '@/features/users/hooks/useUsers';
import type { CreateUserRequest, UserProfile } from '@/features/users/types/user.types';
import { canCreateUsers, canViewUserScope } from '@/features/users/utils/user.utils';
import { APP_ROUTES } from '@/routes/route.constants';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function UserCreatePage() {
  const { user, authorizationStatus } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const [createdUser, setCreatedUser] = useState<UserProfile | null>(null);
  const [emailFailureUserId, setEmailFailureUserId] = useState<string | null>(null);
  const organizationId = user?.organizationId ?? '';
  const createUser = useCreateUser(user?.id ?? '', organizationId);
  const canLoadOptions = Boolean(user && canCreateUsers(user));
  const departmentsQuery = useUserDepartmentOptions(
    canLoadOptions ? (user?.id ?? '') : '',
    canLoadOptions ? organizationId : '',
    canLoadOptions,
    'ACTIVE',
  );
  const canLoadRoles = Boolean(
    user &&
    hasOrganizationPermission(user.authorization, 'roles.view') &&
    hasOrganizationPermission(user.authorization, 'roles.edit'),
  );
  const rolesQuery = useUserRoleCatalog(
    canLoadRoles ? (user?.id ?? '') : '',
    canLoadRoles ? organizationId : '',
    canLoadRoles,
  );

  if (authorizationStatus === 'loading') {
    return <LoadingState label="Checking user creation access" />;
  }

  if (
    authorizationStatus !== 'available' ||
    !user ||
    !organizationId ||
    user.platformRole === 'SUPER_ADMIN' ||
    !canCreateUsers(user)
  ) {
    return <Navigate to={APP_ROUTES.forbidden} replace />;
  }

  const actor = user;
  const canViewDirectory = hasPermission(
    actor.authorization,
    'users.view',
    'organization-or-department',
  );
  const backPath = canViewDirectory ? APP_ROUTES.users : APP_ROUTES.dashboard;

  async function submit(payload: CreateUserRequest) {
    setFormError(null);
    setEmailFailureUserId(null);
    try {
      const created = await createUser.mutateAsync(payload);
      setCreatedUser(created);
      showToast({
        title: 'User created',
        description: `${created.name} was added to this organization.`,
        variant: 'success',
      });
      if (canViewUserScope(actor, created.membership.departmentId)) {
        navigate(`${APP_ROUTES.users}/${created.id}`, { replace: true });
      }
    } catch (error) {
      const authError = getAuthError(error);
      const details = isRecord(authError.details) ? authError.details : null;
      if (authError.code === 'USER_CREATED_EMAIL_FAILED' && typeof details?.userId === 'string') {
        setEmailFailureUserId(details.userId);
        const message =
          'The user was created, but the setup email could not be delivered. Do not retry creation; ask an organization administrator to resend setup instructions.';
        setFormError(message);
        showToast({ title: 'User created; email failed', description: message, variant: 'error' });
        return;
      }
      const message = getAuthErrorMessage(error, 'The user could not be created.');
      setFormError(message);
      showToast({ title: 'User was not created', description: message, variant: 'error' });
    }
  }

  return (
    <div className="workspace-page user-page">
      <nav className="user-breadcrumb" aria-label="Breadcrumb">
        {canViewDirectory ? (
          <Link to={APP_ROUTES.users}>Users</Link>
        ) : (
          <Link to={APP_ROUTES.dashboard}>Workspace</Link>
        )}
        <span aria-hidden="true">/</span>
        <span aria-current="page">Add user</span>
      </nav>
      <PageHeader
        eyebrow="Users"
        title="Add a user"
        description="Create an organization membership and send password setup instructions. The global account remains inactive until setup is complete."
        actions={
          <Button variant="outline" onClick={() => navigate(backPath)}>
            {canViewDirectory ? 'Back to users' : 'Back to workspace'}
          </Button>
        }
      />
      {formError && (
        <Alert variant="error" title="Unable to create user">
          {formError}
          {emailFailureUserId && (
            <p>
              Created user ID: <code>{emailFailureUserId}</code>
            </p>
          )}
        </Alert>
      )}
      {createdUser && !canViewUserScope(actor, createdUser.membership.departmentId) ? (
        <Alert variant="success" title="User created">
          <p>
            {createdUser.name} was added successfully. Your current permissions do not include
            viewing this user's profile.
          </p>
          <p>
            User ID: <code>{createdUser.id}</code>
          </p>
        </Alert>
      ) : emailFailureUserId ? (
        <Alert variant="warning" title="Do not retry user creation">
          The account already exists. Use the user directory or ask an organization administrator to
          resend setup instructions.
          <p>
            Created user ID: <code>{emailFailureUserId}</code>
          </p>
        </Alert>
      ) : (
        <UserForm
          mode="create"
          actor={actor}
          departments={departmentsQuery.data ?? []}
          roles={rolesQuery.data ?? []}
          isSubmitting={createUser.isPending}
          referenceError={
            departmentsQuery.isError
              ? getAuthErrorMessage(
                  departmentsQuery.error,
                  'Department options could not be loaded.',
                )
              : null
          }
          roleOptionsError={
            canLoadRoles && rolesQuery.isError
              ? getAuthErrorMessage(rolesQuery.error, 'Role options could not be loaded.')
              : null
          }
          onCancel={() => navigate(backPath)}
          onSubmit={submit}
        />
      )}
    </div>
  );
}
