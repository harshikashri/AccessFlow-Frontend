import { createContext } from 'react';
import type { LoginRequest, PublicUser } from '@/features/auth/types/auth.types';
import type { AuthStatus } from '@/features/auth/types/auth.types';

export interface AuthContextValue {
  status: AuthStatus;
  user: PublicUser | null;
  error: string | null;
  isInitializing: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<number>;
  restoreSession: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
