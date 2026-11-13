import type { AxiosResponse } from 'axios';
import { apiClient } from '@/services/api/api-client';
import type {
  ApiEnvelope,
  AuthenticatedUser,
  AuthSessionResponse,
  LoginRequest,
  PasswordTokenRequest,
} from '@/features/auth/types/auth.types';
import { isAuthenticatedUser } from '@/features/auth/utils/auth-user';

function unwrap<T>(response: AxiosResponse<ApiEnvelope<T>>): T {
  return response.data.data;
}

export const authService = {
  async login(payload: LoginRequest): Promise<AuthSessionResponse> {
    const response = await apiClient.post<ApiEnvelope<AuthSessionResponse>>('/auth/login', payload);
    return unwrap(response);
  },

  async refresh(): Promise<AuthSessionResponse> {
    const response = await apiClient.post<ApiEnvelope<AuthSessionResponse>>('/auth/refresh');
    return unwrap(response);
  },

  async currentUser(): Promise<AuthenticatedUser> {
    const response = await apiClient.get<ApiEnvelope<{ user: unknown }>>('/auth/me');
    const user = unwrap(response).user;
    if (!isAuthenticatedUser(user)) {
      throw new Error('The current-user response did not contain valid authorization information.');
    }
    return user;
  },

  async logout(): Promise<void> {
    await apiClient.post<ApiEnvelope<unknown>>('/auth/logout');
  },

  async logoutAll(): Promise<number> {
    const response =
      await apiClient.post<ApiEnvelope<{ revokedCount: number }>>('/auth/logout-all');
    return unwrap(response).revokedCount;
  },

  async forgotPassword(email: string): Promise<string> {
    const response = await apiClient.post<ApiEnvelope<unknown>>('/auth/forgot-password', { email });
    return (
      response.data.message ?? 'If an account exists, password reset instructions will be sent.'
    );
  },

  async resetPassword(payload: PasswordTokenRequest): Promise<string> {
    const response = await apiClient.post<ApiEnvelope<unknown>>('/auth/reset-password', payload);
    return response.data.message ?? 'Your password has been reset. You can now sign in.';
  },

  async setPassword(payload: PasswordTokenRequest): Promise<string> {
    const response = await apiClient.post<ApiEnvelope<unknown>>('/auth/set-password', payload);
    return response.data.message ?? 'Your password is set. You can now sign in.';
  },
};
