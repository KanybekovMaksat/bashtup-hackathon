import { createContext } from 'react';
import type { ChangePasswordPayload, LoginPayload, LoginResult, User } from '../types';

export type AuthContextValue = {
  user: User | null;
  isCheckingSession: boolean;
  loginUser: (payload: LoginPayload) => Promise<LoginResult>;
  logoutUser: () => Promise<void>;
  changeUserPassword: (payload: ChangePasswordPayload) => Promise<User | null>;
  refreshUser: () => Promise<User | null>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
