import type {
  CreateOrganizationRequest,
  OrganizationFormErrors,
  OrganizationFormValues,
} from '@/features/organizations/types/organization.types';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateOrganizationForm(
  values: OrganizationFormValues,
  includeInitialAdmin: boolean,
): OrganizationFormErrors {
  const errors: OrganizationFormErrors = {};
  const nameLength = values.name.trim().length;

  if (nameLength < 2 || nameLength > 200) {
    errors.name = 'Organization name must be between 2 and 200 characters.';
  }

  if (!includeInitialAdmin) return errors;

  const adminNameLength = values.adminName.trim().length;
  if (adminNameLength < 2 || adminNameLength > 200) {
    errors.adminName = 'Initial admin name must be between 2 and 200 characters.';
  }

  const email = values.adminEmail.trim();
  if (!emailPattern.test(email)) {
    errors.adminEmail = 'Enter a valid email address.';
  }

  if (values.adminPassword.length < 10) {
    errors.adminPassword = 'Password must be at least 10 characters long.';
  } else if (!/[a-z]/.test(values.adminPassword)) {
    errors.adminPassword = 'Password must include at least one lowercase letter.';
  } else if (!/[A-Z]/.test(values.adminPassword)) {
    errors.adminPassword = 'Password must include at least one uppercase letter.';
  } else if (!/\d/.test(values.adminPassword)) {
    errors.adminPassword = 'Password must include at least one number.';
  } else if (!/[^A-Za-z0-9]/.test(values.adminPassword)) {
    errors.adminPassword = 'Password must include at least one special character.';
  }

  return errors;
}

export function createOrganizationPayload(
  values: OrganizationFormValues,
): CreateOrganizationRequest {
  return {
    name: values.name.trim(),
    admin: {
      name: values.adminName.trim(),
      email: values.adminEmail.trim().toLowerCase(),
      password: values.adminPassword,
    },
  };
}

export function formatOrganizationDate(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'Not available';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(timestamp);
}
