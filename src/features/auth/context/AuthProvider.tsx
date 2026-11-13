import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authService } from '@/features/auth/services/auth.service';
import { accessTokenStore } from '@/features/auth/services/access-token.store';
import { getAuthErrorMessage, isTerminalSessionError } from '@/features/auth/services/auth-errors';
import {
  installAuthInterceptors,
  refreshAccessToken,
} from '@/features/auth/services/auth-interceptors';
import { AuthContext } from '@/features/auth/context/AuthContext';
import type { AuthStatus, PublicUser } from '@/features/auth/types/auth.types';
import type { AuthSessionResponse, LoginRequest } from '@/features/auth/types/auth.types';

interface AuthState {
  status: AuthStatus;
  user: PublicUser | null;
  error: string | null;
}

const initialState: AuthState = {
  status: 'initializing',
  user: null,
  error: null,
};

function toAuthenticatedState(session: AuthSessionResponse, user = session.user): AuthState {
  return {
    status: 'authenticated',
    user,
    error: null,
  };
}

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>(initialState);

  const clearSession = useCallback(() => {
    accessTokenStore.clear();
    queryClient.clear();
    setState({
      status: 'unauthenticated',
      user: null,
      error: null,
    });
  }, [queryClient]);

  useEffect(
    () =>
      installAuthInterceptors({
        onSessionInvalidated: clearSession,
        onSessionRefreshed: (session) => {
          setState((current) =>
            current.status === 'authenticated' ? toAuthenticatedState(session) : current,
          );
        },
      }),
    [clearSession],
  );

  const restoreSession = useCallback(async () => {
    setState((current) => ({
      status: current.status === 'authenticated' ? current.status : 'initializing',
      user: current.user,
      error: null,
    }));

    try {
      const session = await refreshAccessToken();
      const user = await authService.currentUser();
      accessTokenStore.set(session.accessToken);
      setState(toAuthenticatedState(session, user));
    } catch (error) {
      if (isTerminalSessionError(error)) {
        clearSession();
        return;
      }

      accessTokenStore.clear();
      setState({
        status: 'unavailable',
        user: null,
        error: getAuthErrorMessage(
          error,
          'We could not restore your session. Check your connection and try again.',
        ),
      });
    }
  }, [clearSession]);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  const login = useCallback(async (payload: LoginRequest) => {
    const session = await authService.login(payload);
    accessTokenStore.set(session.accessToken);
    setState(toAuthenticatedState(session));
  }, []);

  const logout = useCallback(async () => {
    await authService.currentUser();
    await authService.logout();
    clearSession();
  }, [clearSession]);

  const logoutAll = useCallback(async () => {
    const revokedCount = await authService.logoutAll();
    clearSession();
    return revokedCount;
  }, [clearSession]);

  const value = useMemo(
    () => ({
      ...state,
      isInitializing: state.status === 'initializing',
      isAuthenticated: state.status === 'authenticated',
      login,
      logout,
      logoutAll,
      restoreSession,
    }),
    [login, logout, logoutAll, restoreSession, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
