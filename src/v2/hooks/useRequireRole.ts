import { useEffect } from 'react';
import { useAuth } from './useAuth';
import type { UserRole } from '../types';
import { getHomePathForUser, navigateTo } from '../utils/routes';

export function useRequireRole(role: UserRole) {
  const { isCheckingSession, user } = useAuth();

  useEffect(() => {
    if (!isCheckingSession && user && user.role !== role) {
      navigateTo(getHomePathForUser(user));
    }
  }, [isCheckingSession, role, user]);

  return {
    allowed: Boolean(user && user.role === role),
    isCheckingSession,
  };
}
