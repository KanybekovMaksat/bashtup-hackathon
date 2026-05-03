import type { ReactNode } from 'react';
import { Button, Chip, Toast } from '@heroui/react';
import { clearStoredUser, navigateTo } from '../lib/auth';
import type { AppUser } from '../lib/hackathonTypes';

type DashboardLayoutProps = {
  children: ReactNode;
  currentUser: AppUser;
  eyebrow: string;
  title: string;
  subtitle: string;
};

export function DashboardLayout({
  children,
  currentUser,
  eyebrow,
  subtitle,
  title,
}: DashboardLayoutProps) {
  const handleLogout = () => {
    clearStoredUser();
    Toast.toast.info('Вы вышли из аккаунта.');
    navigateTo('/login');
  };

  return (
    <div className="dashboard-page">
      <header className="dashboard-topbar">
        <a className="dashboard-brand" href="/">
          BashtUp <span>III</span>
        </a>
        <div className="dashboard-user">
          <div>
            <strong>{currentUser.full_name}</strong>
            <span>{currentUser.login}</span>
          </div>
          <Button onPress={handleLogout} variant="outline">
            Выйти
          </Button>
        </div>
      </header>

      <main className="dashboard-shell">
        <div className="dashboard-heading">
          <Chip color="accent" variant="soft">
            {eyebrow}
          </Chip>
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
