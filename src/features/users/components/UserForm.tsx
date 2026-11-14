import { useState, type FormEvent } from 'react';
import { Alert, Button, Card, Input, Select } from '@/components/ui';
import type { Department } from '@/features/departments/types/department.types';
import type { AuthenticatedUser } from '@/features/auth/types/auth.types';
import type {
  CreateUserRequest,
  CreateUserRoleAssignment,
  UpdateUserRequest,
  UserFormErrors,
  UserFormValues,
  UserRole,
  UserScopeType,
} from '@/features/users/types/user.types';
import {
  canAssignRoleAtScope,
  createUserPayload,
  isDuplicateRoleAssignment,
  updateUserPayload,
  validateUserForm,
} from '@/features/users/utils/user.utils';

interface BaseUserFormProps {
  initialValues?: UserFormValues;
  departments: Department[];
  roles: UserRole[];
  actor: AuthenticatedUser;
  isSubmitting: boolean;
  referenceError?: string | null;
  roleOptionsError?: string | null;
  onCancel: () => void;
}

type UserFormProps =
  | (BaseUserFormProps & {
      mode: 'create';
      onSubmit: (payload: CreateUserRequest) => void | Promise<void>;
    })
  | (BaseUserFormProps & {
      mode: 'edit';
      initialValues: UserFormValues;
      onSubmit: (payload: UpdateUserRequest) => void | Promise<void>;
    });

const emptyValues: UserFormValues = {
  name: '',
  email: '',
  departmentId: '',
  roleAssignments: [],
};

export function UserForm(props: UserFormProps) {
  const [values, setValues] = useState<UserFormValues>(props.initialValues ?? emptyValues);
  const [fieldErrors, setFieldErrors] = useState<UserFormErrors>({});
  const [roleId, setRoleId] = useState('');
  const [scopeType, setScopeType] = useState<UserScopeType>('ORGANIZATION');
  const [roleDepartmentId, setRoleDepartmentId] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  function updateField(field: keyof UserFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  const selectedRole = props.roles.find((role) => role.id === roleId);
  const assignmentDepartmentId = scopeType === 'DEPARTMENT' ? roleDepartmentId : null;
  const eligibleRoles = props.roles.filter((role) =>
    canAssignRoleAtScope(props.actor, role, scopeType, assignmentDepartmentId),
  );
  const availableDepartments = props.departments.filter(
    (department) => department.status === 'ACTIVE',
  );

  function addRoleAssignment() {
    if (
      !selectedRole ||
      !canAssignRoleAtScope(props.actor, selectedRole, scopeType, assignmentDepartmentId)
    ) {
      setFieldErrors((current) => ({
        ...current,
        roleAssignments: 'Choose a role and scope that you are authorized to assign.',
      }));
      return;
    }
    const candidate: CreateUserRoleAssignment = {
      roleId: selectedRole.id,
      scopeType,
      departmentId: assignmentDepartmentId,
    };
    if (isDuplicateRoleAssignment(values.roleAssignments, candidate)) {
      setFieldErrors((current) => ({
        ...current,
        roleAssignments: 'This role is already selected at that scope.',
      }));
      return;
    }
    setValues((current) => ({
      ...current,
      roleAssignments: [...current.roleAssignments, candidate],
    }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.roleAssignments;
      return next;
    });
    setRoleId('');
    setRoleDepartmentId('');
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (props.isSubmitting) return;
    const errors = validateUserForm(values);
    setFieldErrors(errors);
    setSubmitError(null);
    if (Object.keys(errors).length > 0) return;

    try {
      if (props.mode === 'create') {
        void props.onSubmit(createUserPayload(values));
      } else {
        const payload = updateUserPayload(values, {
          name: props.initialValues.name,
          email: props.initialValues.email,
        });
        if (Object.keys(payload).length === 0) {
          setSubmitError('No changes were made to save.');
          return;
        }
        void props.onSubmit(payload);
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'The user could not be saved.');
    }
  }

  return (
    <form className="user-form" noValidate onSubmit={handleSubmit}>
      <Card
        title="User information"
        description={
          props.mode === 'create'
            ? 'A password setup email will be sent after the account is created.'
            : "Only the user name and email address can be changed here. Changing the email revokes the user's sessions across organizations."
        }
      >
        <div className="user-form__fields">
          <Input
            label="Full name"
            name="name"
            autoComplete="name"
            value={values.name}
            onChange={(event) => updateField('name', event.target.value)}
            required
            minLength={2}
            maxLength={200}
            {...(fieldErrors.name ? { error: fieldErrors.name } : {})}
            disabled={props.isSubmitting}
          />
          <Input
            label="Email address"
            name="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(event) => updateField('email', event.target.value)}
            required
            maxLength={320}
            {...(fieldErrors.email ? { error: fieldErrors.email } : {})}
            disabled={props.isSubmitting}
          />
          {props.mode === 'create' && (
            <Select
              label="Department"
              name="departmentId"
              value={values.departmentId}
              placeholder="No department"
              onChange={(event) => updateField('departmentId', event.target.value)}
              options={[
                ...availableDepartments.map((department) => ({
                  value: department.id,
                  label: department.name,
                })),
              ]}
              helperText="Department membership is optional."
              disabled={props.isSubmitting || Boolean(props.referenceError)}
            />
          )}
        </div>
      </Card>

      {props.mode === 'create' && (
        <Card
          title="Initial roles"
          description="Role assignments are optional. The user must complete password setup before accessing the organization."
        >
          {props.roleOptionsError && (
            <Alert variant="error" title="Role options are unavailable">
              {props.roleOptionsError} You can still create the user without adding a role.
            </Alert>
          )}
          {props.referenceError && (
            <Alert variant="error" title="Department options are unavailable">
              {props.referenceError} You can still create the user without assigning a department.
            </Alert>
          )}
          {props.roles.length === 0 ? (
            <p className="user-form__note">No assignable roles are available.</p>
          ) : (
            <>
              <div className="user-form__role-fields">
                <Select
                  label="Role"
                  name="roleId"
                  value={roleId}
                  placeholder="Select a role"
                  onChange={(event) => setRoleId(event.target.value)}
                  options={[...eligibleRoles.map((role) => ({ value: role.id, label: role.name }))]}
                  disabled={props.isSubmitting || Boolean(props.roleOptionsError)}
                />
                <Select
                  label="Assignment scope"
                  name="scopeType"
                  value={scopeType}
                  onChange={(event) => {
                    setScopeType(event.target.value as UserScopeType);
                    setRoleDepartmentId('');
                  }}
                  options={[
                    { value: 'ORGANIZATION', label: 'Organization' },
                    { value: 'DEPARTMENT', label: 'Department' },
                  ]}
                  disabled={props.isSubmitting || Boolean(props.roleOptionsError)}
                />
                {scopeType === 'DEPARTMENT' && (
                  <Select
                    label="Role department"
                    name="roleDepartmentId"
                    value={roleDepartmentId}
                    placeholder="Select a department"
                    onChange={(event) => setRoleDepartmentId(event.target.value)}
                    options={[
                      ...availableDepartments.map((department) => ({
                        value: department.id,
                        label: department.name,
                      })),
                    ]}
                    disabled={props.isSubmitting || Boolean(props.referenceError)}
                  />
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addRoleAssignment}
                  disabled={
                    props.isSubmitting ||
                    !roleId ||
                    (scopeType === 'DEPARTMENT' && !roleDepartmentId) ||
                    Boolean(props.roleOptionsError)
                  }
                >
                  Add role
                </Button>
              </div>
              {fieldErrors.roleAssignments && (
                <p className="user-form__error" role="alert">
                  {fieldErrors.roleAssignments}
                </p>
              )}
              {values.roleAssignments.length > 0 && (
                <ul className="user-form__role-list" aria-label="Selected initial roles">
                  {values.roleAssignments.map((assignment) => {
                    const role = props.roles.find((item) => item.id === assignment.roleId);
                    const department = props.departments.find(
                      (item) => item.id === assignment.departmentId,
                    );
                    return (
                      <li
                        key={`${assignment.roleId}:${assignment.scopeType}:${assignment.departmentId ?? ''}`}
                      >
                        <span>
                          {role?.name ?? 'Role'} —{' '}
                          {assignment.scopeType === 'ORGANIZATION'
                            ? 'Organization'
                            : (department?.name ?? 'Department')}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={props.isSubmitting}
                          onClick={() =>
                            setValues((current) => ({
                              ...current,
                              roleAssignments: current.roleAssignments.filter(
                                (item) =>
                                  item.roleId !== assignment.roleId ||
                                  item.scopeType !== assignment.scopeType ||
                                  item.departmentId !== assignment.departmentId,
                              ),
                            }))
                          }
                        >
                          Remove
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </Card>
      )}

      {submitError && (
        <Alert variant="error" title="Unable to save user">
          {submitError}
        </Alert>
      )}
      <div className="user-form__actions">
        <Button
          type="button"
          variant="outline"
          onClick={props.onCancel}
          disabled={props.isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" loading={props.isSubmitting}>
          {props.mode === 'create' ? 'Create user' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
