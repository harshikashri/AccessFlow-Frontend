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
import type {
  AuthenticatedUser,
  AuthStatus,
  AuthorizationStatus,
  LoginRequest,
} from '@/features/auth/types/auth.types';

interface AuthState {
  status: AuthStatus;
  authorizationStatus: AuthorizationStatus;
  user: AuthenticatedUser | null;
  error: string | null;
}

const initialState: AuthState = {
  status: 'initializing',
  authorizationStatus: 'loading',
  user: null,
  error: null,
};

const currentUserQueryKey = ['auth', 'current-user'] as const;

function toAuthenticatedState(user: AuthenticatedUser): AuthState {
  return {
    status: 'authenticated',
    authorizationStatus: 'available',
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
      authorizationStatus: 'unavailable',
      user: null,
      error: null,
    });
  }, [queryClient]);

  const loadCurrentUser = useCallback(
    () =>
      queryClient.fetchQuery({
        queryKey: currentUserQueryKey,
        queryFn: () => authService.currentUser(),
        staleTime: 0,
      }),
    [queryClient],
  );

  useEffect(
    () =>
      installAuthInterceptors({
        onSessionInvalidated: clearSession,
      }),
    [clearSession],
  );

  const restoreSession = useCallback(async () => {
    setState({
      status: 'initializing',
      authorizationStatus: 'loading',
      user: null,
      error: null,
    });

    try {
      await refreshAccessToken();
      const user = await loadCurrentUser();
      setState(toAuthenticatedState(user));
    } catch (error) {
      if (isTerminalSessionError(error)) {
        clearSession();
        return;
      }

      accessTokenStore.clear();
      queryClient.clear();
      setState({
        status: 'unavailable',
        authorizationStatus: 'unavailable',
        user: null,
        error: getAuthErrorMessage(
          error,
          'We could not restore your session. Check your connection and try again.',
        ),
      });
    }
  }, [clearSession, loadCurrentUser, queryClient]);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  const login = useCallback(
    async (payload: LoginRequest) => {
      setState({
        status: 'initializing',
        authorizationStatus: 'loading',
        user: null,
        error: null,
      });

      try {
        const session = await authService.login(payload);
        accessTokenStore.set(session.accessToken);
        const user = await loadCurrentUser();
        setState(toAuthenticatedState(user));
      } catch (error) {
        clearSession();
        throw error;
      }
    },
    [clearSession, loadCurrentUser],
  );

  const refreshCurrentUser = useCallback(async () => {
    if (state.status !== 'authenticated' || !state.user) {
      throw new Error('An authenticated session is required to refresh the profile.');
    }

    setState((current) => ({ ...current, authorizationStatus: 'loading', error: null }));
    try {
      const user = await loadCurrentUser();
      setState((current) =>
        current.status === 'authenticated'
          ? { ...current, authorizationStatus: 'available', user, error: null }
          : current,
      );
      return user;
    } catch (error) {
      queryClient.removeQueries({ queryKey: currentUserQueryKey });
      setState((current) =>
        current.status === 'authenticated'
          ? {
              ...current,
              authorizationStatus: 'unavailable',
              error: getAuthErrorMessage(
                error,
                'We could not refresh your access. Try again before continuing.',
              ),
            }
          : current,
      );
      throw error;
    }
  }, [loadCurrentUser, queryClient, state.status, state.user]);

  const logout = useCallback(async () => {
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
      refreshCurrentUser,
    }),
    [login, logout, logoutAll, refreshCurrentUser, restoreSession, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
