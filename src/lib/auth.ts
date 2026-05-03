import type { AppUser, Role } from './hackathonTypes';

const AUTH_STORAGE_KEY = 'bashtup_current_user';

export const roleHomePath: Record<Role, string> = {
  admin: '/admin',
  jury: '/jury',
  leader: '/participant',
};

export function getStoredUser(): AppUser | null {
  const rawValue = localStorage.getItem(AUTH_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as AppUser;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function storeUser(user: AppUser) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredUser() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function navigateTo(path: string) {
  if (window.location.pathname === path) {
    window.dispatchEvent(new PopStateEvent('popstate'));
    return;
  }

  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function getAllowedPathForUser(user: AppUser | null) {
  return user ? roleHomePath[user.role] : '/login';
}
