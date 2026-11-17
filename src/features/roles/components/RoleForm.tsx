import { useState, type FormEvent, type ReactNode } from 'react';
import { Alert, Button, Checkbox, Input, Select } from '@/components/ui';
import { Textarea } from '@/components/ui/Textarea';
import type { RoleFormErrors, RoleFormValues } from '@/features/roles/types/role.types';
import { validateRoleForm } from '@/features/roles/utils/role.utils';

interface RoleFormProps {
  initialValues: RoleFormValues;
  isBuiltIn: boolean;
  isLegacyCustomRoleUnconfigured?: boolean;
  showBasicInformationIntro?: boolean;
  isSaving: boolean;
  error?: string | null;
  children?: ReactNode;
  formId?: string;
  submitLabel?: string;
  onCancel: () => void;
  onSubmit: (values: RoleFormValues) => Promise<void>;
}

export function RoleForm({
  initialValues,
  isBuiltIn,
  isLegacyCustomRoleUnconfigured = false,
  showBasicInformationIntro = true,
  isSaving,
  error,
  children,
  formId,
  submitLabel = 'Save role details',
  onCancel,
  onSubmit,
}: RoleFormProps) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<RoleFormErrors>({});
  const sameScopes =
    values.assignmentScopes.length === initialValues.assignmentScopes.length &&
    values.assignmentScopes.every((scope) => initialValues.assignmentScopes.includes(scope));
  const isDirty =
    values.name !== initialValues.name ||
    values.description !== initialValues.description ||
    values.rolePurpose !== initialValues.rolePurpose ||
    !sameScopes;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateRoleForm(values, !isBuiltIn);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    await onSubmit({
      ...values,
      name: values.name.trim(),
      description: values.description.trim(),
    });
  }

  return (
    <form
      {...(formId ? { id: formId } : {})}
      className="role-form"
      onSubmit={(event) => void handleSubmit(event)}
      noValidate
    >
      {error && (
        <Alert variant="error" title="Role could not be saved">
          {error}
        </Alert>
      )}
      <section
        className="role-form__section"
        aria-labelledby={showBasicInformationIntro ? 'role-basic-heading' : undefined}
      >
        {showBasicInformationIntro && (
          <div>
            <h2 id="role-basic-heading">Basic information</h2>
            <p>Role definitions belong to the active organization.</p>
          </div>
        )}
        <div className="role-form__fields">
          <Input
            label="Role name"
            name="name"
            value={values.name}
            maxLength={200}
            required
            disabled={isBuiltIn || isSaving}
            {...(errors.name ? { error: errors.name } : {})}
            onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
          />
          <Textarea
            label="Description"
            name="description"
            value={values.description}
            maxLength={1000}
            rows={4}
            disabled={isSaving}
            {...(errors.description ? { error: errors.description } : {})}
            helperText="A short explanation helps administrators choose the correct role."
            onChange={(event) =>
              setValues((current) => ({ ...current, description: event.target.value }))
            }
          />
          {!isBuiltIn && (
            <>
              <Select
                label="Role purpose"
                name="rolePurpose"
                value={values.rolePurpose}
                disabled={isSaving}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    rolePurpose: event.target.value as RoleFormValues['rolePurpose'],
                  }))
                }
                options={[
                  { value: 'GENERAL', label: 'General' },
                  { value: 'FINANCE_APPROVER', label: 'Finance Approver' },
                ]}
                helperText="Purpose is a backend-defined role classification."
              />
              <fieldset className="role-form__scope-options" disabled={isSaving}>
                <legend>Supported assignment scopes</legend>
                <p>
                  Administrators can assign this role at any selected scope. Finance Approver
                  purpose does not restrict its supported scopes.
                </p>
                <Checkbox
                  name="assignmentScopes"
                  value="ORGANIZATION"
                  label="Organization"
                  checked={values.assignmentScopes.includes('ORGANIZATION')}
                  disabled={isSaving}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      assignmentScopes: event.target.checked
                        ? [...current.assignmentScopes, 'ORGANIZATION']
                        : current.assignmentScopes.filter((scope) => scope !== 'ORGANIZATION'),
                    }))
                  }
                />
                <Checkbox
                  name="assignmentScopes"
                  value="DEPARTMENT"
                  label="Department"
                  checked={values.assignmentScopes.includes('DEPARTMENT')}
                  disabled={isSaving}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      assignmentScopes: event.target.checked
                        ? [...current.assignmentScopes, 'DEPARTMENT']
                        : current.assignmentScopes.filter((scope) => scope !== 'DEPARTMENT'),
                    }))
                  }
                />
                {errors.assignmentScopes && (
                  <p className="ui-field__message ui-field__message--error" role="alert">
                    {errors.assignmentScopes}
                  </p>
                )}
                {isLegacyCustomRoleUnconfigured && (
                  <p className="ui-field__message">
                    This legacy custom role is unconfigured. Select at least one scope before
                    saving.
                  </p>
                )}
              </fieldset>
            </>
          )}
        </div>
      </section>
      {children}
      <div className="role-form__actions">
        <Button variant="outline" type="button" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" loading={isSaving} disabled={!isDirty}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
