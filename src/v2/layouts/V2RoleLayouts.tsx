import type { MouseEvent, ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { V2Button } from '../components/common';
import { V2_ROUTES, navigateTo } from '../utils/routes';

type NavItem = {
  href: string;
  label: string;
};

type V2LayoutProps = {
  children: ReactNode;
  navItems: NavItem[];
  path: string;
  subtitle?: string;
  title: string;
};

function V2ShellLayout({
  children,
  navItems,
  path,
  subtitle,
  title,
}: V2LayoutProps) {
  const { logoutUser, user } = useAuth();

  const handleNav = (href: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    navigateTo(href);
  };

  return (
    <div className="v2-app">
      <aside className="v2-sidebar">
        <a className="v2-brand" href={V2_ROUTES.auth} onClick={handleNav(V2_ROUTES.auth)}>
          BashtUp <span>v2</span>
        </a>
        <nav className="v2-nav" aria-label="Навигация кабинета">
          {navItems.map((item) => (
            <a
              className={path.startsWith(item.href) ? 'is-active' : ''}
              href={item.href}
              key={item.href}
              onClick={handleNav(item.href)}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </aside>

      <div className="v2-main">
        <header className="v2-topbar">
          <div>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <div className="v2-user">
            <div>
              <strong>{user?.fullName ?? 'Пользователь'}</strong>
              <span>{user?.login}</span>
            </div>
            <V2Button onClick={() => void logoutUser()} variant="secondary">
              Выйти
            </V2Button>
          </div>
        </header>
        <main className="v2-content">{children}</main>
      </div>
    </div>
  );
}

const adminNavItems: NavItem[] = [
  { href: V2_ROUTES.admin.dashboard, label: 'Dashboard' },
  { href: V2_ROUTES.admin.users, label: 'Пользователи' },
  { href: V2_ROUTES.admin.projects, label: 'Проекты' },
  { href: V2_ROUTES.admin.criteria, label: 'Критерии' },
  { href: V2_ROUTES.admin.nominations, label: 'Номинации' },
  { href: V2_ROUTES.admin.results, label: 'Результаты' },
  { href: V2_ROUTES.admin.analytics, label: 'Аналитика' },
];

const teamNavItems: NavItem[] = [
  { href: V2_ROUTES.team.dashboard, label: 'Главная' },
  { href: V2_ROUTES.team.profile, label: 'Команда' },
  { href: V2_ROUTES.team.project, label: 'Проект' },
  { href: V2_ROUTES.team.results, label: 'Результаты' },
];

const juryNavItems: NavItem[] = [
  { href: V2_ROUTES.jury.dashboard, label: 'Главная' },
  { href: V2_ROUTES.jury.projects, label: 'Проекты для оценки' },
];

export function AdminLayout({
  children,
  path,
  title,
}: {
  children: ReactNode;
  path: string;
  title: string;
}) {
  return (
    <V2ShellLayout
      navItems={adminNavItems}
      path={path}
      subtitle="Администрирование второй версии платформы"
      title={title}
    >
      {children}
    </V2ShellLayout>
  );
}

export function TeamLayout({
  children,
  path,
  teamName,
  title,
}: {
  children: ReactNode;
  path: string;
  teamName?: string;
  title: string;
}) {
  return (
    <V2ShellLayout
      navItems={teamNavItems}
      path={path}
      subtitle={teamName ? `Команда: ${teamName}` : 'Кабинет участника'}
      title={title}
    >
      {children}
    </V2ShellLayout>
  );
}

export function JuryLayout({
  children,
  path,
  title,
}: {
  children: ReactNode;
  path: string;
  title: string;
}) {
  return (
    <V2ShellLayout
      navItems={juryNavItems}
      path={path}
      subtitle="Кабинет жюри"
      title={title}
    >
      {children}
    </V2ShellLayout>
  );
}
