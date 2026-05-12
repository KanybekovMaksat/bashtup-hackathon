import type { User, UserRole, UserStatus } from './auth.types';

export type AdminUser = User & {
  createdAt?: string | null;
};

export type CreateUserPayload = {
  login: string;
  role: UserRole;
  fullName: string;
  email?: string | null;
};

export type UpdateUserPayload = Partial<CreateUserPayload> & {
  status?: UserStatus;
};

export type CreateUserResult = {
  user: AdminUser;
  temporaryPassword?: string | null;
};

export type ResetPasswordResult = {
  temporaryPassword: string;
};
