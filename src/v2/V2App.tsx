import { useEffect } from 'react';
import { V2AuthProvider } from './store/authStore';
import { ChangePasswordPage } from './pages/auth/ChangePasswordPage';
import { AuthPage } from './pages/auth/AuthPage';
import { AdminLayout } from './layouts/AdminLayout';
import { TeamLayout } from './layouts/TeamLayout';
import { JuryLayout } from './layouts/JuryLayout';
import {
  AdminDashboardPage,
  AnalyticsPage,
  CriteriaPage,
  NominationsPage,
  ProjectDetailsPage,
  ProjectsPage,
  ResultsPage,
  UsersPage,
} from './pages/admin/AdminPages';
import {
  ProjectFormPage,
  TeamDashboardPage,
  TeamProfilePage,
  TeamResultsPage,
} from './pages/team/TeamPages';
import {
  JuryDashboardPage,
  JuryProjectDetailsPage,
  JuryProjectsPage,
  JuryScorePage,
} from './pages/jury/JuryPages';
import {
  V2Button,
  V2ProtectedRoute,
  V2RoleGuard,
} from './components/common';
import { useAuth } from './hooks/useAuth';
import {
  V2_ROUTES,
  getHomePathForUser,
  navigateTo,
  normalizePath,
} from './utils/routes';
import './styles.css';

function V2ForbiddenPage() {
  return (
    <main className="v2-auth">
      <section className="v2-auth-card">
        <div className="v2-auth-card__header">
          <span>403</span>
          <h1>Доступ запрещен</h1>
        </div>
        <V2Button onClick={() => navigateTo(V2_ROUTES.auth)}>На страницу входа</V2Button>
      </section>
    </main>
  );
}

function V2NotFoundPage() {
  return (
    <main className="v2-auth">
      <section className="v2-auth-card">
        <div className="v2-auth-card__header">
          <span>404</span>
          <h1>Страница не найдена</h1>
        </div>
        <V2Button onClick={() => navigateTo(V2_ROUTES.auth)}>На страницу входа</V2Button>
      </section>
    </main>
  );
}

function V2IndexRedirect() {
  const { isCheckingSession, user } = useAuth();

  useEffect(() => {
    if (!isCheckingSession) {
      navigateTo(getHomePathForUser(user));
    }
  }, [isCheckingSession, user]);

  return null;
}

function V2AdminRoutes({ path }: { path: string }) {
  const parts = path.split('/').filter(Boolean);
  const projectId = parts[2] === 'projects' ? parts[3] : undefined;

  if (path === V2_ROUTES.admin.dashboard || path === '/v2/admin') {
    return (
      <AdminLayout path={path} title="Dashboard">
        <AdminDashboardPage />
      </AdminLayout>
    );
  }

  if (path === V2_ROUTES.admin.users) {
    return (
      <AdminLayout path={path} title="Пользователи">
        <UsersPage />
      </AdminLayout>
    );
  }

  if (path === V2_ROUTES.admin.projects) {
    return (
      <AdminLayout path={path} title="Проекты">
        <ProjectsPage />
      </AdminLayout>
    );
  }

  if (projectId && parts.length === 4) {
    return (
      <AdminLayout path={V2_ROUTES.admin.projects} title="Детали проекта">
        <ProjectDetailsPage projectId={projectId} />
      </AdminLayout>
    );
  }

  if (path === V2_ROUTES.admin.criteria) {
    return (
      <AdminLayout path={path} title="Критерии">
        <CriteriaPage />
      </AdminLayout>
    );
  }

  if (path === V2_ROUTES.admin.nominations) {
    return (
      <AdminLayout path={path} title="Номинации">
        <NominationsPage />
      </AdminLayout>
    );
  }

  if (path === V2_ROUTES.admin.results) {
    return (
      <AdminLayout path={path} title="Результаты">
        <ResultsPage />
      </AdminLayout>
    );
  }

  if (path === V2_ROUTES.admin.analytics) {
    return (
      <AdminLayout path={path} title="Аналитика">
        <AnalyticsPage />
      </AdminLayout>
    );
  }

  return <V2NotFoundPage />;
}

function V2TeamRoutes({ path }: { path: string }) {
  if (path === V2_ROUTES.team.dashboard || path === '/v2/team') {
    return (
      <TeamLayout path={path} title="Главная">
        <TeamDashboardPage />
      </TeamLayout>
    );
  }

  if (path === V2_ROUTES.team.profile) {
    return (
      <TeamLayout path={path} title="Команда">
        <TeamProfilePage />
      </TeamLayout>
    );
  }

  if (path === V2_ROUTES.team.project) {
    return (
      <TeamLayout path={path} title="Проект">
        <ProjectFormPage />
      </TeamLayout>
    );
  }

  if (path === V2_ROUTES.team.results) {
    return (
      <TeamLayout path={path} title="Результаты">
        <TeamResultsPage />
      </TeamLayout>
    );
  }

  return <V2NotFoundPage />;
}

function V2JuryRoutes({ path }: { path: string }) {
  const parts = path.split('/').filter(Boolean);
  const projectId =
    parts[1] === 'jury' && parts[2] === 'projects' ? parts[3] : undefined;
  const isScoreRoute = Boolean(projectId && parts[4] === 'score');

  if (path === V2_ROUTES.jury.dashboard || path === '/v2/jury') {
    return (
      <JuryLayout path={path} title="Главная">
        <JuryDashboardPage />
      </JuryLayout>
    );
  }

  if (path === V2_ROUTES.jury.projects) {
    return (
      <JuryLayout path={path} title="Проекты для оценки">
        <JuryProjectsPage />
      </JuryLayout>
    );
  }

  if (projectId && isScoreRoute) {
    return (
      <JuryLayout path={V2_ROUTES.jury.projects} title="Оценка проекта">
        <JuryScorePage projectId={projectId} />
      </JuryLayout>
    );
  }

  if (projectId) {
    return (
      <JuryLayout path={V2_ROUTES.jury.projects} title="Детали проекта">
        <JuryProjectDetailsPage projectId={projectId} />
      </JuryLayout>
    );
  }

  return <V2NotFoundPage />;
}

function V2Router({ path }: { path: string }) {
  const normalizedPath = normalizePath(path);
  const { isCheckingSession, user } = useAuth();

  useEffect(() => {
    if (
      !isCheckingSession &&
      user?.mustChangePassword &&
      normalizedPath !== V2_ROUTES.changePassword
    ) {
      navigateTo(V2_ROUTES.changePassword);
    }
  }, [isCheckingSession, normalizedPath, user]);

  if (normalizedPath === '/v2') {
    return <V2IndexRedirect />;
  }

  if (normalizedPath === V2_ROUTES.auth) {
    return <AuthPage />;
  }

  if (normalizedPath === V2_ROUTES.changePassword) {
    return (
      <V2ProtectedRoute>
        <ChangePasswordPage />
      </V2ProtectedRoute>
    );
  }

  if (normalizedPath === V2_ROUTES.forbidden) {
    return <V2ForbiddenPage />;
  }

  if (normalizedPath.startsWith('/v2/admin')) {
    return (
      <V2ProtectedRoute>
        <V2RoleGuard role="admin">
          <V2AdminRoutes path={normalizedPath} />
        </V2RoleGuard>
      </V2ProtectedRoute>
    );
  }

  if (normalizedPath.startsWith('/v2/team')) {
    return (
      <V2ProtectedRoute>
        <V2RoleGuard role="participant">
          <V2TeamRoutes path={normalizedPath} />
        </V2RoleGuard>
      </V2ProtectedRoute>
    );
  }

  if (normalizedPath.startsWith('/v2/jury')) {
    return (
      <V2ProtectedRoute>
        <V2RoleGuard role="jury">
          <V2JuryRoutes path={normalizedPath} />
        </V2RoleGuard>
      </V2ProtectedRoute>
    );
  }

  return <V2NotFoundPage />;
}

export function V2App({ path }: { path: string }) {
  return (
    <V2AuthProvider>
      <V2Router path={path} />
    </V2AuthProvider>
  );
}
