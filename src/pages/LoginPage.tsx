import { useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Button, Card, Chip, Input, Toast } from '@heroui/react';
import { navigateTo, roleHomePath, storeUser } from '../lib/auth';
import { loginWithPassword } from '../lib/hackathonApi';

export function LoginPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!login.trim() || !password.trim()) {
      setError('Введите логин и пароль.');
      return;
    }

    setIsSubmitting(true);

    try {
      const user = await loginWithPassword(login.trim(), password.trim());

      if (!user) {
        setError('Пользователь с таким логином и паролем не найден.');
        return;
      }

      storeUser(user);
      Toast.toast.success('Вход выполнен.');
      navigateTo(roleHomePath[user.role]);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Не удалось выполнить вход.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <Card className="login-card">
        <Card.Header>
          <Chip color="accent" variant="soft" className='flex justify-center'>
            BashtUp III
          </Chip>
        </Card.Header>
        <Card.Content>
          <form className="dashboard-form" onSubmit={handleSubmit}>
            <label className="dashboard-field">
              <span>Логин</span>
              <Input
                autoComplete="username"
                disabled={isSubmitting}
                onChange={(event) => setLogin(event.target.value)}
                value={login}
              />
            </label>
            <label className="dashboard-field">
              <span>Пароль</span>
              <Input
                autoComplete="current-password"
                disabled={isSubmitting}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
            </label>

            {error && (
              <Alert role="alert" status="danger">
                <Alert.Content>
                  <Alert.Title>{error}</Alert.Title>
                </Alert.Content>
              </Alert>
            )}

            <Button isDisabled={isSubmitting} type="submit">
              {isSubmitting ? 'Проверяем...' : 'Войти'}
            </Button>
          </form>
        </Card.Content>
      </Card>
    </main>
  );
}
