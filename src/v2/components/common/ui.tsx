import type {
  ButtonHTMLAttributes,
  ChangeEventHandler,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole } from '../../types';
import { V2_ROUTES, getHomePathForUser, navigateTo } from '../../utils/routes';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

type V2ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
  variant?: ButtonVariant;
};

export function V2Button({
  children,
  className,
  disabled,
  isLoading = false,
  type = 'button',
  variant = 'primary',
  ...props
}: V2ButtonProps) {
  return (
    <button
      className={cx('v2-button', `v2-button--${variant}`, className)}
      disabled={disabled || isLoading}
      type={type}
      {...props}
    >
      {isLoading ? 'Загрузка...' : children}
    </button>
  );
}

type FieldProps = {
  error?: string;
  label: string;
};

export function V2Input({
  className,
  error,
  label,
  ...props
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cx('v2-field', className)}>
      <span>{label}</span>
      <input aria-invalid={Boolean(error)} {...props} />
      {error && <small className="v2-field-error">{error}</small>}
    </label>
  );
}

export function V2Textarea({
  className,
  error,
  label,
  ...props
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className={cx('v2-field', className)}>
      <span>{label}</span>
      <textarea aria-invalid={Boolean(error)} rows={4} {...props} />
      {error && <small className="v2-field-error">{error}</small>}
    </label>
  );
}

type V2SelectProps = FieldProps &
  SelectHTMLAttributes<HTMLSelectElement> & {
    onValueChange?: (value: string) => void;
    options: Array<{ label: string; value: string }>;
    placeholder?: string;
  };

export function V2Select({
  className,
  error,
  label,
  onChange,
  onValueChange,
  options,
  placeholder,
  ...props
}: V2SelectProps) {
  const handleChange: ChangeEventHandler<HTMLSelectElement> = (event) => {
    onChange?.(event);
    onValueChange?.(event.target.value);
  };

  return (
    <label className={cx('v2-field', className)}>
      <span>{label}</span>
      <select aria-invalid={Boolean(error)} onChange={handleChange} {...props}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <small className="v2-field-error">{error}</small>}
    </label>
  );
}

export function V2Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
}) {
  return <span className={`v2-badge v2-badge--${tone}`}>{children}</span>;
}

export function V2Loader({ label = 'Загрузка...' }: { label?: string }) {
  return (
    <div className="v2-state" role="status">
      <span className="v2-loader-dot" />
      <p>{label}</p>
    </div>
  );
}

export function V2EmptyState({
  action,
  title = 'Данные не найдены',
}: {
  action?: ReactNode;
  title?: string;
}) {
  return (
    <div className="v2-state">
      <p>{title}</p>
      {action}
    </div>
  );
}

export function V2ErrorState({
  action,
  message = 'Не удалось загрузить данные',
}: {
  action?: ReactNode;
  message?: string;
}) {
  return (
    <div className="v2-state v2-state--error" role="alert">
      <p>{message}</p>
      {action}
    </div>
  );
}

export function V2Modal({
  children,
  footer,
  isOpen,
  onClose,
  title,
}: {
  children: ReactNode;
  footer?: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title: string;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="v2-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-modal="true"
        className="v2-modal"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="v2-modal__header">
          <h2>{title}</h2>
          <V2Button aria-label="Закрыть" onClick={onClose} variant="ghost">
            x
          </V2Button>
        </header>
        <div className="v2-modal__body">{children}</div>
        {footer && <footer className="v2-modal__footer">{footer}</footer>}
      </section>
    </div>
  );
}

export function V2ConfirmModal({
  confirmLabel = 'Подтвердить',
  isLoading,
  isOpen,
  message,
  onCancel,
  onConfirm,
  title,
  tone = 'danger',
}: {
  confirmLabel?: string;
  isLoading?: boolean;
  isOpen: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  tone?: ButtonVariant;
}) {
  return (
    <V2Modal
      footer={
        <>
          <V2Button onClick={onCancel} variant="secondary">
            Отмена
          </V2Button>
          <V2Button isLoading={isLoading} onClick={onConfirm} variant={tone}>
            {confirmLabel}
          </V2Button>
        </>
      }
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
    >
      <p className="v2-muted">{message}</p>
    </V2Modal>
  );
}

type V2Column<T> = {
  header: string;
  render: (row: T, index: number) => ReactNode;
};

export function V2Table<T>({
  columns,
  emptyText = 'Данные не найдены',
  rows,
}: {
  columns: Array<V2Column<T>>;
  emptyText?: string;
  rows: T[];
}) {
  if (!rows.length) {
    return <V2EmptyState title={emptyText} />;
  }

  return (
    <div className="v2-table-wrap">
      <table className="v2-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.header}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column) => (
                <td key={column.header}>{column.render(row, rowIndex)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function V2ProtectedRoute({ children }: { children: ReactNode }) {
  const { isCheckingSession, user } = useAuth();

  useEffect(() => {
    if (!isCheckingSession && !user) {
      navigateTo(V2_ROUTES.auth);
    }
  }, [isCheckingSession, user]);

  if (isCheckingSession) {
    return <V2Loader label="Проверяем сессию..." />;
  }

  return user ? children : null;
}

export function V2RoleGuard({
  children,
  role,
}: {
  children: ReactNode;
  role: UserRole;
}) {
  const { isCheckingSession, user } = useAuth();

  useEffect(() => {
    if (!isCheckingSession && user && user.role !== role) {
      navigateTo(getHomePathForUser(user));
    }
  }, [isCheckingSession, role, user]);

  if (isCheckingSession) {
    return <V2Loader label="Проверяем доступ..." />;
  }

  if (!user) {
    return null;
  }

  return user.role === role ? children : null;
}
