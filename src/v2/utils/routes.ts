import type { User, UserRole } from '../types';

export const V2_ROUTES = {
  auth: '/auth',
  changePassword: '/auth/change-password',
  forbidden: '/v2/403',
  notFound: '/v2/404',
  admin: {
    dashboard: '/v2/admin/dashboard',
    users: '/v2/admin/users',
    projects: '/v2/admin/projects',
    criteria: '/v2/admin/criteria',
    nominations: '/v2/admin/nominations',
    results: '/v2/admin/results',
    analytics: '/v2/admin/analytics',
  },
  team: {
    dashboard: '/v2/team/dashboard',
    profile: '/v2/team/profile',
    project: '/v2/team/project',
    results: '/v2/team/results',
  },
  jury: {
    dashboard: '/v2/jury/dashboard',
    projects: '/v2/jury/projects',
  },
} as const;

export const roleHomePath: Record<UserRole, string> = {
  admin: V2_ROUTES.admin.dashboard,
  jury: V2_ROUTES.jury.dashboard,
  participant: V2_ROUTES.team.dashboard,
};

export function normalizePath(path: string) {
  return path.replace(/\/+$/, '') || '/';
}

export function navigateTo(path: string) {
  if (window.location.pathname === path) {
    window.dispatchEvent(new PopStateEvent('popstate'));
    return;
  }

  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function getHomePathForUser(user: User | null) {
  return user ? roleHomePath[user.role] : V2_ROUTES.auth;
}

export function getRoleForPath(path: string): UserRole | null {
  if (path.startsWith('/v2/admin')) {
    return 'admin';
  }

  if (path.startsWith('/v2/team')) {
    return 'participant';
  }

  if (path.startsWith('/v2/jury')) {
    return 'jury';
  }

  return null;
}

export function buildProjectPath(base: string, projectId: string) {
  return `${base}/${encodeURIComponent(projectId)}`;
}
