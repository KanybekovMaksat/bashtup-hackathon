import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { V2Button, V2Input, V2Loader } from '../../components/common';
import { fieldErrorsFromApiError, getApiErrorMessage } from '../../services/apiClient';
import { useAuth } from '../../hooks/useAuth';
import { getHomePathForUser, navigateTo, V2_ROUTES } from '../../utils/routes';

export function AuthPage() {
  const { isCheckingSession, loginUser, user } = useAuth();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isCheckingSession && user) {
      navigateTo(user.mustChangePassword ? V2_ROUTES.changePassword : getHomePathForUser(user));
    }
  }, [isCheckingSession, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!login.trim() || !password.trim()) {
      setFieldErrors({
        login: !login.trim() ? 'Введите логин' : '',
        password: !password.trim() ? 'Введите пароль' : '',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await loginUser({
        login: login.trim(),
        password,
      });

      navigateTo(
        result.mustChangePassword
          ? V2_ROUTES.changePassword
          : getHomePathForUser(result.user),
      );
    } catch (submitError) {
      setFieldErrors(fieldErrorsFromApiError(submitError));
      setError(getApiErrorMessage(submitError, 'Не удалось войти'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="v2-auth">
        <V2Loader label="Проверяем сессию..." />
      </div>
    );
  }

  return (
    <main className="v2-auth">
      <section className="v2-auth-card">
        <div className="v2-auth-card__header">
          <span>BashtUp v2</span>
          <h1>Вход в платформу</h1>
        </div>
        <form className="v2-form" onSubmit={handleSubmit}>
          <V2Input
            autoComplete="username"
            disabled={isSubmitting}
            error={fieldErrors.login}
            label="Логин"
            onChange={(event) => setLogin(event.target.value)}
            value={login}
          />
          <V2Input
            autoComplete="current-password"
            disabled={isSubmitting}
            error={fieldErrors.password}
            label="Пароль"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
          {error && <p className="v2-form-alert">{error}</p>}
          <V2Button isLoading={isSubmitting} type="submit">
            Войти
          </V2Button>
        </form>
      </section>
    </main>
  );
}
