import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Alert, Badge, Button, Card, Modal, Select } from '@/components/ui';
import { useToast } from '@/components/ui/useToast';
import { useAuth } from '@/features/auth/context/useAuth';
import { getAuthErrorMessage } from '@/features/auth/services/auth-errors';
import { hasOrganizationPermission, hasPermission } from '@/features/authorization/permissions';
import {
  useUserDepartmentOptions,
  useUserDetails,
  useUserRoleAssignments,
  useUserRoleCatalog,
  useAssignUserDepartment,
  useSendUserPasswordInstructions,
  useSetUserMembershipStatus,
  useAssignUserRole,
  useRemoveUserRole,
} from '@/features/users/hooks/useUsers';
import type { UserStatus } from '@/features/users/types/user.types';
import {
  canAssignUserToDepartment,
  canEditUserScope,
  canManageUserMembership,
  canViewUserScope,
  isUserId,
} from '@/features/users/utils/user.utils';
import {
  UserAccountStatusBadge,
  UserMembershipStatusBadge,
} from '@/features/users/components/UserStatusBadge';
import { UserRoleAssignments } from '@/features/users/components/UserRoleAssignments';
import { APP_ROUTES } from '@/routes/route.constants';

function formatDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    date,
  );
}

export function UserDetailsPage() {
  const { user, authorizationStatus } = useAuth();
  const { userId = '' } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [departmentDialogOpen, setDepartmentDialogOpen] = useState(false);
  const [nextDepartmentId, setNextDepartmentId] = useState('');
  const [membershipChange, setMembershipChange] = useState<UserStatus | null>(null);
  const [departmentError, setDepartmentError] = useState<string | null>(null);
  const [membershipError, setMembershipError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const organizationId = user?.organizationId ?? '';
  const hasViewPermission = Boolean(
    user && hasPermission(user.authorization, 'users.view', 'organization-or-department'),
  );
  const isValidUserId = isUserId(userId);
  const detailsQuery = useUserDetails(
    hasViewPermission ? (user?.id ?? '') : '',
    hasViewPermission ? organizationId : '',
    userId,
    hasViewPermission && isValidUserId,
  );
  const targetUser = detailsQuery.data;
  const targetDepartmentId = targetUser?.membership.departmentId ?? null;
  const canEdit = Boolean(user && targetUser && canEditUserScope(user, targetDepartmentId));
  const canViewDepartments = Boolean(
    user && hasPermission(user.authorization, 'departments.view', 'organization-or-department'),
  );
  const departmentsQuery = useUserDepartmentOptions(
    canEdit && canViewDepartments ? (user?.id ?? '') : '',
    canEdit && canViewDepartments ? organizationId : '',
    canEdit && canViewDepartments,
    'ACTIVE',
  );
  const canLoadRoles = Boolean(user && hasOrganizationPermission(user.authorization, 'roles.view'));
  const rolesQuery = useUserRoleCatalog(
    canLoadRoles ? (user?.id ?? '') : '',
    canLoadRoles ? organizationId : '',
    canLoadRoles,
  );
  const assignmentsQuery = useUserRoleAssignments(
    canLoadRoles ? (user?.id ?? '') : '',
    canLoadRoles ? organizationId : '',
    userId,
    canLoadRoles && isValidUserId,
  );
  const assignDepartment = useAssignUserDepartment(user?.id ?? '', organizationId, userId);
  const setMembershipStatus = useSetUserMembershipStatus(user?.id ?? '', organizationId);
  const sendPasswordInstructions = useSendUserPasswordInstructions(userId);
  const assignRole = useAssignUserRole(user?.id ?? '', organizationId, userId);
  const removeRole = useRemoveUserRole(user?.id ?? '', organizationId, userId);

  if (authorizationStatus === 'loading') {
    return <LoadingState label="Checking user access" />;
  }
  if (
    authorizationStatus !== 'available' ||
    !user ||
    !organizationId ||
    user.platformRole === 'SUPER_ADMIN' ||
    !hasViewPermission ||
    !isValidUserId
  ) {
    return <Navigate to={APP_ROUTES.forbidden} replace />;
  }
  if (detailsQuery.isPending) {
    return <LoadingState label="Loading user profile" />;
  }
  if (detailsQuery.isError || !targetUser) {
    return (
      <div className="workspace-page user-page">
        <ErrorState
          title="User could not be loaded"
          description={getAuthErrorMessage(
            detailsQuery.error,
            'The user profile is unavailable in your authorized scope.',
          )}
          action={
            <Button variant="outline" onClick={() => void detailsQuery.refetch()}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }
  if (!canViewUserScope(user, targetUser.membership.departmentId)) {
    return <Navigate to={APP_ROUTES.forbidden} replace />;
  }

  const profile = targetUser;
  const actor = user;
  const canEditProfile = canEditUserScope(actor, targetUser.membership.departmentId);
  const canManageMembership = canManageUserMembership(actor, targetUser.membership.departmentId);
  const canChangeMembership = canManageMembership && targetUser.id !== actor.id;
  const canManageRoles =
    canLoadRoles && hasOrganizationPermission(actor.authorization, 'roles.edit');
  const activeDepartments = (departmentsQuery.data ?? []).filter(
    (department) =>
      department.status === 'ACTIVE' &&
      canAssignUserToDepartment(actor, targetUser.membership.departmentId, department.id),
  );
  const canTransferDepartment =
    canEditProfile &&
    canViewDepartments &&
    (targetUser.membership.departmentId === null ||
      canEditUserScope(actor, targetUser.membership.departmentId));

  async function submitDepartmentChange() {
    if (!canTransferDepartment || assignDepartment.isPending) return;
    setDepartmentError(null);
    try {
      await assignDepartment.mutateAsync({
        departmentId: nextDepartmentId || null,
      });
      setDepartmentDialogOpen(false);
      showToast({
        title: 'Department updated',
        description: `${profile.name}'s organization membership was transferred.`,
        variant: 'success',
      });
    } catch (error) {
      setDepartmentError(
        getAuthErrorMessage(error, 'The department membership could not be changed.'),
      );
    }
  }

  async function submitMembershipChange() {
    if (!membershipChange || !canChangeMembership || setMembershipStatus.isPending) return;
    setMembershipError(null);
    try {
      await setMembershipStatus.mutateAsync({
        targetUserId: profile.id,
        status: membershipChange,
      });
      setMembershipChange(null);
      showToast({
        title: membershipChange === 'ACTIVE' ? 'Membership reactivated' : 'Membership deactivated',
        description: `${profile.name}'s organization membership was updated.`,
        variant: 'success',
      });
    } catch (error) {
      setMembershipError(
        getAuthErrorMessage(error, 'The organization membership could not be updated.'),
      );
    }
  }

  async function resendPasswordInstructions() {
    setPasswordError(null);
    try {
      await sendPasswordInstructions.mutateAsync();
      showToast({
        title: 'Instructions sent',
        description: 'Password setup or reset instructions were sent to the user.',
        variant: 'success',
      });
    } catch (error) {
      const message = getAuthErrorMessage(error, 'Instructions could not be sent.');
      setPasswordError(message);
      showToast({ title: 'Instructions were not sent', description: message, variant: 'error' });
    }
  }

  return (
    <div className="workspace-page user-page">
      <nav className="user-breadcrumb" aria-label="Breadcrumb">
        <Link to={APP_ROUTES.users}>Users</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{targetUser.name}</span>
      </nav>
      <PageHeader
        eyebrow="User profile"
        title={targetUser.name}
        description={targetUser.email}
        actions={
          <div className="user-page__header-actions">
            {canEditProfile && (
              <Button onClick={() => navigate(`${APP_ROUTES.users}/${targetUser.id}/edit`)}>
                Edit profile
              </Button>
            )}
            {canEditProfile && (
              <Button
                variant="outline"
                loading={sendPasswordInstructions.isPending}
                onClick={() => void resendPasswordInstructions()}
              >
                Send password instructions
              </Button>
            )}
            {canChangeMembership && (
              <Button
                variant={targetUser.membership.status === 'ACTIVE' ? 'destructive' : 'primary'}
                onClick={() =>
                  setMembershipChange(
                    targetUser.membership.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                  )
                }
              >
                {targetUser.membership.status === 'ACTIVE'
                  ? 'Deactivate membership'
                  : 'Reactivate membership'}
              </Button>
            )}
          </div>
        }
      />

      {passwordError && (
        <Alert variant="error" title="Password instructions were not sent">
          {passwordError}
        </Alert>
      )}
      <Card
        title="Account and membership"
        description="Global account status and this organization's membership status are separate."
      >
        <dl className="user-profile-details">
          <div>
            <dt>Email</dt>
            <dd>{targetUser.email}</dd>
          </div>
          <div>
            <dt>Global account</dt>
            <dd>
              <UserAccountStatusBadge
                status={targetUser.accountStatus}
                {...(targetUser.passwordSetupRequired === undefined
                  ? {}
                  : { passwordSetupRequired: targetUser.passwordSetupRequired })}
              />
            </dd>
          </div>
          <div>
            <dt>Organization membership</dt>
            <dd>
              <UserMembershipStatusBadge status={targetUser.membership.status} />
            </dd>
          </div>
          <div>
            <dt>Department</dt>
            <dd>{targetUser.membership.department?.name ?? 'Unassigned'}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{formatDate(targetUser.createdAt)}</dd>
          </div>
          <div>
            <dt>Last updated</dt>
            <dd>{formatDate(targetUser.updatedAt)}</dd>
          </div>
        </dl>
        {canTransferDepartment && (
          <div className="user-profile__actions">
            <Button
              variant="outline"
              onClick={() => {
                setDepartmentError(null);
                setNextDepartmentId(targetUser.membership.departmentId ?? '');
                setDepartmentDialogOpen(true);
              }}
            >
              Change department
            </Button>
          </div>
        )}
      </Card>

      {canLoadRoles ? (
        <UserRoleAssignments
          actor={actor}
          roles={rolesQuery.data ?? []}
          assignments={assignmentsQuery.data ?? []}
          departments={departmentsQuery.data ?? []}
          isLoading={rolesQuery.isPending || assignmentsQuery.isPending}
          loadError={rolesQuery.error ?? assignmentsQuery.error}
          canManage={canManageRoles}
          isSaving={assignRole.isPending || removeRole.isPending}
          onRetry={() => {
            void rolesQuery.refetch();
            void assignmentsQuery.refetch();
          }}
          onAssign={async (roleId, payload) => {
            await assignRole.mutateAsync({ roleId, payload });
          }}
          onRemove={async (roleId, payload) => {
            await removeRole.mutateAsync({ roleId, payload });
          }}
        />
      ) : (
        <Card title="Role assignments">
          {targetUser.roleAssignments.length === 0 ? (
            <p className="user-form__note">No active role assignments are listed.</p>
          ) : (
            <ul className="user-basic-role-list">
              {targetUser.roleAssignments
                .filter((assignment) => assignment.status === 'ACTIVE')
                .map((assignment) => (
                  <li
                    key={`${assignment.roleId}:${assignment.scopeType}:${assignment.departmentId ?? ''}`}
                  >
                    <strong>{assignment.roleName ?? 'Role'}</strong>
                    <Badge variant="information">
                      {assignment.scopeType === 'ORGANIZATION' ? 'Organization' : 'Department'}
                    </Badge>
                  </li>
                ))}
            </ul>
          )}
        </Card>
      )}

      <Modal
        open={departmentDialogOpen}
        title="Change department"
        description="This transfers only the user's membership in the current organization. Department Manager role assignments are not changed."
        onOpenChange={(open) => {
          if (!assignDepartment.isPending) setDepartmentDialogOpen(open);
        }}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setDepartmentDialogOpen(false)}
              disabled={assignDepartment.isPending}
            >
              Cancel
            </Button>
            <Button
              loading={assignDepartment.isPending}
              disabled={
                assignDepartment.isPending ||
                (nextDepartmentId || null) === targetUser.membership.departmentId ||
                (Boolean(nextDepartmentId) &&
                  !canAssignUserToDepartment(
                    actor,
                    targetUser.membership.departmentId,
                    nextDepartmentId,
                  ))
              }
              onClick={() => void submitDepartmentChange()}
            >
              Save department
            </Button>
          </>
        }
      >
        {departmentError && (
          <Alert variant="error" title="Department was not changed">
            {departmentError}
          </Alert>
        )}
        {departmentsQuery.isError && (
          <Alert variant="error" title="Department options could not be loaded">
            {getAuthErrorMessage(departmentsQuery.error, 'Retry before transferring this user.')}
            <Button variant="outline" size="sm" onClick={() => void departmentsQuery.refetch()}>
              Retry
            </Button>
          </Alert>
        )}
        <Select
          label="Department"
          name="departmentId"
          value={nextDepartmentId}
          placeholder="Unassigned"
          onChange={(event) => setNextDepartmentId(event.target.value)}
          options={[
            ...activeDepartments.map((department) => ({
              value: department.id,
              label: department.name,
            })),
          ]}
          disabled={departmentsQuery.isError || departmentsQuery.isPending}
          helperText="Only active departments within your edit scope are selectable."
        />
      </Modal>

      <Modal
        open={membershipChange !== null}
        title={
          membershipChange === 'ACTIVE'
            ? 'Reactivate organization membership?'
            : 'Deactivate organization membership?'
        }
        description="This changes only the current organization's membership and revokes sessions for this organization on deactivation. Global account status and other organization memberships remain unchanged."
        onOpenChange={(open) => {
          if (!setMembershipStatus.isPending && !open) setMembershipChange(null);
        }}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setMembershipChange(null)}
              disabled={setMembershipStatus.isPending}
            >
              Cancel
            </Button>
            <Button
              variant={membershipChange === 'INACTIVE' ? 'destructive' : 'primary'}
              loading={setMembershipStatus.isPending}
              onClick={() => void submitMembershipChange()}
            >
              {membershipChange === 'ACTIVE' ? 'Reactivate membership' : 'Deactivate membership'}
            </Button>
          </>
        }
      >
        {membershipError && (
          <Alert variant="error" title="Membership was not changed">
            {membershipError}
          </Alert>
        )}
        <p>
          {membershipChange === 'ACTIVE'
            ? `${targetUser.name}'s membership will be active. They can access the organization once their global account is active and password setup is complete.`
            : `${targetUser.name} will lose access to this organization.`}
        </p>
      </Modal>
    </div>
  );
}
