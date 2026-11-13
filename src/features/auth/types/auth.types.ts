export interface PublicUser {
  id: string;
  name: string;
  email: string;
  platformRole: 'SUPER_ADMIN' | null;
  organizationId: string | null;
}

export interface AuthSessionResponse {
  accessToken: string;
  user: PublicUser;
}

export interface LoginRequest {
  email: string;
  password: string;
  organizationId?: string;
}

export interface PasswordTokenRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  code: string;
  details?: unknown;
}

export type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated' | 'unavailable';
