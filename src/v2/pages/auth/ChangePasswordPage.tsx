import { useState } from 'react';
import type { FormEvent } from 'react';
import { V2Button, V2Input } from '../../components/common';
import { fieldErrorsFromApiError, getApiErrorMessage } from '../../services/apiClient';
import { useAuth } from '../../hooks/useAuth';
import { hasErrors, validatePasswordChange } from '../../utils/validators';

export function ChangePasswordPage() {
  const { changeUserPassword } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationErrors = validatePasswordChange(
      oldPassword,
      newPassword,
      repeatPassword,
    );
    setFieldErrors(validationErrors);
    setError(null);

    if (hasErrors(validationErrors)) {
      return;
    }

    setIsSubmitting(true);

    try {
      await changeUserPassword({ newPassword, oldPassword });
    } catch (submitError) {
      setFieldErrors(fieldErrorsFromApiError(submitError));
      setError(getApiErrorMessage(submitError, 'Не удалось сменить пароль'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="v2-auth">
      <section className="v2-auth-card">
        <div className="v2-auth-card__header">
          <span>BashtUp v2</span>
          <h1>Смена пароля</h1>
        </div>
        <form className="v2-form" onSubmit={handleSubmit}>
          <V2Input
            autoComplete="current-password"
            disabled={isSubmitting}
            error={fieldErrors.oldPassword}
            label="Старый пароль"
            onChange={(event) => setOldPassword(event.target.value)}
            type="password"
            value={oldPassword}
          />
          <V2Input
            autoComplete="new-password"
            disabled={isSubmitting}
            error={fieldErrors.newPassword}
            label="Новый пароль"
            onChange={(event) => setNewPassword(event.target.value)}
            type="password"
            value={newPassword}
          />
          <ul className="v2-password-hints">
            <li className={newPassword.length >= 8 ? 'v2-hint--ok' : ''}>Минимум 8 символов</li>
            <li className={/[A-Z]/.test(newPassword) ? 'v2-hint--ok' : ''}>Хотя бы одна заглавная буква (A-Z)</li>
            <li className={/[a-z]/.test(newPassword) ? 'v2-hint--ok' : ''}>Хотя бы одна строчная буква (a-z)</li>
            <li className={/\d/.test(newPassword) ? 'v2-hint--ok' : ''}>Хотя бы одна цифра (0-9)</li>
          </ul>
          <V2Input
            autoComplete="new-password"
            disabled={isSubmitting}
            error={fieldErrors.repeatPassword}
            label="Повтор нового пароля"
            onChange={(event) => setRepeatPassword(event.target.value)}
            type="password"
            value={repeatPassword}
          />
          {error && <p className="v2-form-alert">{error}</p>}
          <V2Button isLoading={isSubmitting} type="submit">
            Сохранить
          </V2Button>
        </form>
      </section>
    </main>
  );
}
