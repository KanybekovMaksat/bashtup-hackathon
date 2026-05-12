export type UserRole = 'admin' | 'jury' | 'participant';

export type UserStatus = 'active' | 'blocked' | 'deleted';

export type User = {
  id: string;
  login: string;
  role: UserRole;
  fullName: string;
  email?: string | null;
  status?: UserStatus;
  mustChangePassword?: boolean;
};

export type LoginPayload = {
  login: string;
  password: string;
};

export type LoginResult = {
  user: User;
  mustChangePassword?: boolean;
  accessToken: string;
  refreshToken: string;
};

export type ChangePasswordPayload = {
  oldPassword: string;
  newPassword: string;
};
