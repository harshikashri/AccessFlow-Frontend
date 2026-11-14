import { describe, expect, it } from 'vitest';
import {
  createOrganizationPayload,
  formatOrganizationDate,
  validateOrganizationForm,
} from '@/features/organizations/utils/organization.utils';
import type { OrganizationFormValues } from '@/features/organizations/types/organization.types';

const validValues: OrganizationFormValues = {
  name: '  Acme Corporation ',
  adminName: '  Jane Admin ',
  adminEmail: ' JANE@EXAMPLE.COM ',
  adminPassword: 'StrongPass!1',
};

describe('organization form utilities', () => {
  it('matches backend organization and initial-admin validation', () => {
    expect(validateOrganizationForm(validValues, true)).toEqual({});
    expect(createOrganizationPayload(validValues)).toEqual({
      name: 'Acme Corporation',
      admin: {
        name: 'Jane Admin',
        email: 'jane@example.com',
        password: 'StrongPass!1',
      },
    });
  });

  it('requires the supported name and initial-admin constraints', () => {
    expect(
      validateOrganizationForm(
        {
          name: 'A',
          adminName: 'J',
          adminEmail: 'invalid',
          adminPassword: 'weak',
        },
        true,
      ),
    ).toEqual({
      name: 'Organization name must be between 2 and 200 characters.',
      adminName: 'Initial admin name must be between 2 and 200 characters.',
      adminEmail: 'Enter a valid email address.',
      adminPassword: 'Password must be at least 10 characters long.',
    });
  });

  it('does not require or submit admin fields while editing', () => {
    expect(
      validateOrganizationForm(
        { name: 'Acme', adminName: '', adminEmail: '', adminPassword: '' },
        false,
      ),
    ).toEqual({});
  });

  it('handles invalid timestamps without throwing', () => {
    expect(formatOrganizationDate('not-a-date')).toBe('Not available');
  });
});
