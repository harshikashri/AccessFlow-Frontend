import { createContext } from 'react';
import type { AuthenticatedUser, LoginRequest } from '@/features/auth/types/auth.types';
import type { AuthStatus } from '@/features/auth/types/auth.types';
import type { AuthorizationStatus } from '@/features/auth/types/auth.types';

export interface AuthContextValue {
  status: AuthStatus;
  authorizationStatus: AuthorizationStatus;
  user: AuthenticatedUser | null;
  error: string | null;
  isInitializing: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<number>;
  restoreSession: () => Promise<void>;
  refreshCurrentUser: () => Promise<AuthenticatedUser>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
