import { isAxiosError } from 'axios';
import type { ApiErrorResponse } from '@/features/auth/types/auth.types';

export interface AuthError {
  status?: number;
  code?: string;
  message: string;
  details?: unknown;
}

export function getAuthError(error: unknown): AuthError {
  if (isAxiosError<ApiErrorResponse>(error)) {
    const body = error.response?.data;
    return {
      message: body?.message ?? '',
      ...(error.response?.status === undefined ? {} : { status: error.response.status }),
      ...(body?.code === undefined ? {} : { code: body.code }),
      ...(body?.details === undefined ? {} : { details: body.details }),
    };
  }

  return {
    message: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
  };
}

export function getAuthErrorMessage(error: unknown, fallback: string): string {
  const message = getAuthError(error).message;
  return message.trim() ? message : fallback;
}

export function isTerminalSessionError(error: unknown): boolean {
  const { status } = getAuthError(error);
  return status === 401 || status === 403;
}

export function isAccessTokenExpired(error: unknown): boolean {
  const authError = getAuthError(error);
  return authError.status === 401 && authError.code === 'TOKEN_EXPIRED';
}

export function getOrganizationIds(error: unknown): string[] {
  const details = getAuthError(error).details;
  if (!details || typeof details !== 'object' || !('organizations' in details)) {
    return [];
  }

  const organizations = (details as { organizations?: unknown }).organizations;
  if (!Array.isArray(organizations)) {
    return [];
  }

  return organizations.filter(
    (organization): organization is string => typeof organization === 'string',
  );
}
