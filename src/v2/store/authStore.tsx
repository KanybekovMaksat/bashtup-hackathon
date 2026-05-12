import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { changePassword, getCurrentUser, login, logout } from '../services/authService';
import { V2ApiError } from '../services/apiClient';
import type { ChangePasswordPayload, LoginPayload, User } from '../types';
import { V2_ROUTES, getHomePathForUser, navigateTo } from '../utils/routes';
import { AuthContext, type AuthContextValue } from './authContext';

export function V2AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      return currentUser;
    } catch (error) {
      if (error instanceof V2ApiError && error.status !== 401) {
        throw error;
      }

      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    void getCurrentUser()
      .then((currentUser) => {
        if (isMounted) {
          setUser(currentUser);
        }
      })
      .catch(() => {
        if (isMounted) {
          setUser(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsCheckingSession(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const loginUser = useCallback(async (payload: LoginPayload) => {
    const result = await login(payload);
    setUser(result.user);
    return result;
  }, []);

  const logoutUser = useCallback(async () => {
    try {
      await logout();
    } finally {
      setUser(null);
      navigateTo(V2_ROUTES.auth);
    }
  }, []);

  const changeUserPassword = useCallback(
    async (payload: ChangePasswordPayload) => {
      const changedUser = await changePassword(payload);
      const nextUser = changedUser ?? (await refreshUser());
      setUser(nextUser);
      navigateTo(getHomePathForUser(nextUser));
      return nextUser;
    },
    [refreshUser],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      changeUserPassword,
      isCheckingSession,
      loginUser,
      logoutUser,
      refreshUser,
      user,
    }),
    [
      changeUserPassword,
      isCheckingSession,
      loginUser,
      logoutUser,
      refreshUser,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
