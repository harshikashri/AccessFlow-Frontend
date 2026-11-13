import { describe, expect, it } from 'vitest';
import {
  getAuthErrorMessage,
  getOrganizationIds,
  isAccessTokenExpired,
} from '@/features/auth/services/auth-errors';

describe('auth error normalization', () => {
  it('uses a friendly fallback for network errors without an API response', () => {
    expect(
      getAuthErrorMessage(
        { isAxiosError: true, message: 'Network Error' },
        'Unable to reach the server.',
      ),
    ).toBe('Unable to reach the server.');
  });

  it('preserves backend messages and recognizes only the expired-token code', () => {
    const expiredError = {
      isAxiosError: true,
      response: {
        status: 401,
        data: {
          success: false,
          code: 'TOKEN_EXPIRED',
          message: 'The access token has expired.',
          details: { organizations: ['org-1'] },
        },
      },
    };

    expect(getAuthErrorMessage(expiredError, 'Fallback')).toBe('The access token has expired.');
    expect(isAccessTokenExpired(expiredError)).toBe(true);
    expect(getOrganizationIds(expiredError)).toEqual(['org-1']);
    expect(
      isAccessTokenExpired({
        ...expiredError,
        response: { status: 401, data: { code: 'INVALID_TOKEN' } },
      }),
    ).toBe(false);
  });
});
