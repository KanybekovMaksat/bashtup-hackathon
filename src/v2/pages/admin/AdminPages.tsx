/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  V2Badge,
  V2Button,
  V2ConfirmModal,
  V2EmptyState,
  V2ErrorState,
  V2Input,
  V2Loader,
  V2Modal,
  V2Select,
  V2Table,
  V2Textarea,
} from '../../components/common';
import {
  archiveCriterion,
  assignProjectJury,
  blockAdminUser,
  createAdminUser,
  createCriterion,
  createNomination,
  fetchAdminDashboard,
  fetchAdminProject,
  fetchAdminProjects,
  fetchAdminUsers,
  fetchAnalytics,
  fetchCriteria,
  fetchDirections,
  fetchNominations,
  fetchResults,
  publishResults,
  resetAdminUserPassword,
  updateAdminProject,
  updateAdminUser,
  updateCriterion,
  updateNomination,
  type CriterionPayload,
  type NominationPayload,
} from '../../services/adminService';
import { fieldErrorsFromApiError, getApiErrorMessage } from '../../services/apiClient';
import type {
  AdminDashboardStats,
  AdminProject,
  AdminUser,
  Analytics,
  Criterion,
  Direction,
  Nomination,
  ResultRow,
  UserRole,
} from '../../types';
import { V2_ROUTES, buildProjectPath, navigateTo } from '../../utils/routes';

type AsyncState<T> = {
  data: T;
  error: string | null;
  isLoading: boolean;
};

const roleOptions = [
  { label: 'admin', value: 'admin' },
  { label: 'jury', value: 'jury' },
  { label: 'participant', value: 'participant' },
];

const statusOptions = [
  { label: 'draft', value: 'draft' },
  { label: 'submitted', value: 'submitted' },
  { label: 'under_review', value: 'under_review' },
  { label: 'evaluated', value: 'evaluated' },
  { label: 'rejected', value: 'rejected' },
  { label: 'published', value: 'published' },
];

function projectStatusTone(status: string) {
  if (status === 'published' || status === 'evaluated') {
    return 'success' as const;
  }

  if (status === 'rejected') {
    return 'danger' as const;
  }

  if (status === 'submitted' || status === 'under_review') {
    return 'warning' as const;
  }

  return 'neutral' as const;
}

function ScoreValue({ value }: { value?: number | null }) {
  return <strong>{Number.isFinite(value ?? NaN) ? value : '-'}</strong>;
}

function MetricGrid({
  items,
}: {
  items: Array<{ label: string; value: string | number }>;
}) {
  return (
    <div className="v2-metric-grid">
      {items.map((item) => (
        <article className="v2-metric" key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </article>
      ))}
    </div>
  );
}

function SectionToolbar({ children }: { children: ReactNode }) {
  return <div className="v2-toolbar">{children}</div>;
}

export function AdminDashboardPage() {
  const [state, setState] = useState<AsyncState<AdminDashboardStats | null>>({
    data: null,
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    void fetchAdminDashboard()
      .then((data) => setState({ data, error: null, isLoading: false }))
      .catch((error) =>
        setState({
          data: null,
          error: getApiErrorMessage(error, 'Не удалось загрузить dashboard'),
          isLoading: false,
        }),
      );
  }, []);

  if (state.isLoading) {
    return <V2Loader />;
  }

  if (state.error || !state.data) {
    return <V2ErrorState message={state.error ?? undefined} />;
  }

  return (
    <div className="v2-stack">
      <MetricGrid
        items={[
          { label: 'Проекты', value: state.data.totalProjects },
          { label: 'Отправленные', value: state.data.submittedProjects },
          { label: 'Черновики', value: state.data.draftProjects },
          { label: 'Участники', value: state.data.participants },
          { label: 'Жюри', value: state.data.jury },
          { label: 'Прогресс оценивания', value: `${state.data.evaluationProgress}%` },
        ]}
      />
      <section className="v2-panel">
        <h2>Быстрые ссылки</h2>
        <div className="v2-action-grid">
          {[
            ['Пользователи', V2_ROUTES.admin.users],
            ['Проекты', V2_ROUTES.admin.projects],
            ['Критерии', V2_ROUTES.admin.criteria],
            ['Результаты', V2_ROUTES.admin.results],
          ].map(([label, href]) => (
            <V2Button key={href} onClick={() => navigateTo(href)} variant="secondary">
              {label}
            </V2Button>
          ))}
        </div>
      </section>
    </div>
  );
}

function UserFormModal({
  initialUser,
  isOpen,
  onClose,
  onSaved,
}: {
  initialUser?: AdminUser | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (temporaryPassword?: string | null) => void;
}) {
  const [form, setForm] = useState({
    email: '',
    fullName: '',
    login: '',
    role: 'participant' as UserRole,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setForm({
      email: initialUser?.email ?? '',
      fullName: initialUser?.fullName ?? '',
      login: initialUser?.login ?? '',
      role: initialUser?.role ?? 'participant',
    });
    setErrors({});
    setSubmitError(null);
  }, [initialUser, isOpen]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};

    if (!form.login.trim()) {
      nextErrors.login = 'Введите логин';
    }

    if (!form.fullName.trim()) {
      nextErrors.fullName = 'Введите ФИО или название команды';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (initialUser) {
        await updateAdminUser(initialUser.id, form);
        onSaved(null);
      } else {
        const result = await createAdminUser(form);
        onSaved(result.temporaryPassword);
      }

      onClose();
    } catch (error) {
      setErrors(fieldErrorsFromApiError(error));
      setSubmitError(getApiErrorMessage(error, 'Не удалось сохранить пользователя'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <V2Modal
      footer={
        <>
          <V2Button onClick={onClose} variant="secondary">
            Отмена
          </V2Button>
          <V2Button form="v2-user-form" isLoading={isSubmitting} type="submit">
            Сохранить
          </V2Button>
        </>
      }
      isOpen={isOpen}
      onClose={onClose}
      title={initialUser ? 'Редактирование пользователя' : 'Создание пользователя'}
    >
      <form className="v2-form" id="v2-user-form" onSubmit={handleSubmit}>
        <V2Input
          disabled={isSubmitting}
          error={errors.login}
          label="Логин"
          onChange={(event) => setForm({ ...form, login: event.target.value })}
          value={form.login}
        />
        <V2Select
          disabled={isSubmitting}
          error={errors.role}
          label="Роль"
          onValueChange={(role) => setForm({ ...form, role: role as UserRole })}
          options={roleOptions}
          value={form.role}
        />
        <V2Input
          disabled={isSubmitting}
          error={errors.fullName}
          label="ФИО / название команды"
          onChange={(event) => setForm({ ...form, fullName: event.target.value })}
          value={form.fullName}
        />
        <V2Input
          disabled={isSubmitting}
          error={errors.email}
          label="Email"
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          type="email"
          value={form.email}
        />
        {submitError && <p className="v2-form-alert">{submitError}</p>}
      </form>
    </V2Modal>
  );
}

export function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<
    | { kind: 'block'; user: AdminUser }
    | { kind: 'reset'; user: AdminUser }
    | null
  >(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);

    try {
      setUsers(await fetchAdminUsers({ role: roleFilter, search }));
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, 'Не удалось загрузить пользователей'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((user) => {
      const roleMatches = roleFilter ? user.role === roleFilter : true;
      const searchMatches = query
        ? `${user.fullName} ${user.login}`.toLowerCase().includes(query)
        : true;

      return roleMatches && searchMatches;
    });
  }, [roleFilter, search, users]);

  const handleConfirm = async () => {
    if (!confirmAction) {
      return;
    }

    setIsActionLoading(true);

    try {
      if (confirmAction.kind === 'reset') {
        const result = await resetAdminUserPassword(confirmAction.user.id);
        setTemporaryPassword(result.temporaryPassword);
      } else {
        const shouldBlock = confirmAction.user.status !== 'blocked';
        await blockAdminUser(confirmAction.user.id, shouldBlock);
      }

      setConfirmAction(null);
      await loadUsers();
    } catch (error) {
      setError(getApiErrorMessage(error, 'Не удалось выполнить действие'));
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="v2-stack">
      <SectionToolbar>
        <V2Select
          label="Роль"
          onValueChange={(value) => setRoleFilter(value as UserRole | '')}
          options={roleOptions}
          placeholder="Все роли"
          value={roleFilter}
        />
        <V2Input
          label="Поиск"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Имя или логин"
          value={search}
        />
        <V2Button
          onClick={() => {
            setEditingUser(null);
            setIsFormOpen(true);
          }}
        >
          Создать пользователя
        </V2Button>
      </SectionToolbar>

      {isLoading ? (
        <V2Loader />
      ) : error ? (
        <V2ErrorState action={<V2Button onClick={() => void loadUsers()}>Повторить</V2Button>} message={error} />
      ) : (
        <V2Table
          columns={[
            { header: 'Логин', render: (user) => user.login },
            { header: 'Имя', render: (user) => user.fullName },
            { header: 'Роль', render: (user) => <V2Badge tone="info">{user.role}</V2Badge> },
            {
              header: 'Статус',
              render: (user) => (
                <V2Badge tone={user.status === 'blocked' ? 'danger' : 'success'}>
                  {user.status ?? 'active'}
                </V2Badge>
              ),
            },
            {
              header: 'Действия',
              render: (user) => (
                <div className="v2-table-actions">
                  <V2Button
                    onClick={() => {
                      setEditingUser(user);
                      setIsFormOpen(true);
                    }}
                    variant="secondary"
                  >
                    Редактировать
                  </V2Button>
                  <V2Button
                    onClick={() => setConfirmAction({ kind: 'reset', user })}
                    variant="secondary"
                  >
                    Сбросить пароль
                  </V2Button>
                  <V2Button
                    onClick={() => setConfirmAction({ kind: 'block', user })}
                    variant="danger"
                  >
                    {user.status === 'blocked' ? 'Разблокировать' : 'Блокировать'}
                  </V2Button>
                </div>
              ),
            },
          ]}
          emptyText="Пользователи не найдены"
          rows={filteredUsers}
        />
      )}

      <UserFormModal
        initialUser={editingUser}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSaved={(password) => {
          if (password) {
            setTemporaryPassword(password);
          }

          void loadUsers();
        }}
      />
      <V2Modal
        footer={<V2Button onClick={() => setTemporaryPassword(null)}>Понятно</V2Button>}
        isOpen={Boolean(temporaryPassword)}
        onClose={() => setTemporaryPassword(null)}
        title="Временный пароль"
      >
        <p className="v2-muted">Пароль показывается только один раз.</p>
        <pre className="v2-secret">{temporaryPassword}</pre>
      </V2Modal>
      <V2ConfirmModal
        confirmLabel={confirmAction?.kind === 'reset' ? 'Сбросить' : 'Подтвердить'}
        isLoading={isActionLoading}
        isOpen={Boolean(confirmAction)}
        message={
          confirmAction?.kind === 'reset'
            ? 'После сброса будет создан новый временный пароль.'
            : 'Статус пользователя будет изменен.'
        }
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => void handleConfirm()}
        title={confirmAction?.kind === 'reset' ? 'Сброс пароля' : 'Блокировка пользователя'}
      />
    </div>
  );
}

function ProjectEditModal({
  initialProject,
  isOpen,
  onClose,
  onSaved,
}: {
  initialProject: AdminProject | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    directionName: '',
    githubUrl: '',
    mvpUrl: '',
    presentationUrl: '',
    problem: '',
    shortDescription: '',
    solution: '',
    status: 'draft',
    targetAudience: '',
    title: '',
    youtubeUrl: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setForm({
      directionName: initialProject?.directionName ?? '',
      githubUrl: initialProject?.githubUrl ?? '',
      mvpUrl: initialProject?.mvpUrl ?? '',
      presentationUrl: initialProject?.presentationUrl ?? '',
      problem: initialProject?.problem ?? '',
      shortDescription: initialProject?.shortDescription ?? '',
      solution: initialProject?.solution ?? '',
      status: initialProject?.status ?? 'draft',
      targetAudience: initialProject?.targetAudience ?? '',
      title: initialProject?.title ?? '',
      youtubeUrl: initialProject?.youtubeUrl ?? '',
    });
    setError(null);
  }, [initialProject, isOpen]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!initialProject) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await updateAdminProject(initialProject.id, form as Partial<AdminProject>);
      onSaved();
      onClose();
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, 'Не удалось сохранить проект'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <V2Modal
      footer={
        <>
          <V2Button onClick={onClose} variant="secondary">
            Отмена
          </V2Button>
          <V2Button form="v2-project-edit" isLoading={isSubmitting} type="submit">
            Сохранить
          </V2Button>
        </>
      }
      isOpen={isOpen}
      onClose={onClose}
      title="Редактирование проекта"
    >
      <form className="v2-form" id="v2-project-edit" onSubmit={handleSubmit}>
        <V2Input
          disabled={isSubmitting}
          label="Название проекта"
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          value={form.title}
        />
        <V2Input
          disabled={isSubmitting}
          label="Направление"
          onChange={(event) => setForm({ ...form, directionName: event.target.value })}
          value={form.directionName}
        />
        <V2Select
          disabled={isSubmitting}
          label="Статус"
          onValueChange={(status) => setForm({ ...form, status })}
          options={statusOptions}
          value={form.status}
        />
        <V2Textarea
          disabled={isSubmitting}
          label="Краткое описание"
          onChange={(event) => setForm({ ...form, shortDescription: event.target.value })}
          value={form.shortDescription}
        />
        <V2Textarea
          disabled={isSubmitting}
          label="Проблема"
          onChange={(event) => setForm({ ...form, problem: event.target.value })}
          value={form.problem}
        />
        <V2Textarea
          disabled={isSubmitting}
          label="Решение"
          onChange={(event) => setForm({ ...form, solution: event.target.value })}
          value={form.solution}
        />
        <V2Input
          disabled={isSubmitting}
          label="Целевая аудитория"
          onChange={(event) => setForm({ ...form, targetAudience: event.target.value })}
          value={form.targetAudience}
        />
        <V2Input
          disabled={isSubmitting}
          label="MVP"
          onChange={(event) => setForm({ ...form, mvpUrl: event.target.value })}
          value={form.mvpUrl}
        />
        <V2Input
          disabled={isSubmitting}
          label="Презентация"
          onChange={(event) => setForm({ ...form, presentationUrl: event.target.value })}
          value={form.presentationUrl}
        />
        <V2Input
          disabled={isSubmitting}
          label="GitHub"
          onChange={(event) => setForm({ ...form, githubUrl: event.target.value })}
          value={form.githubUrl}
        />
        <V2Input
          disabled={isSubmitting}
          label="YouTube"
          onChange={(event) => setForm({ ...form, youtubeUrl: event.target.value })}
          value={form.youtubeUrl}
        />
        {error && <p className="v2-form-alert">{error}</p>}
      </form>
    </V2Modal>
  );
}

function JuryAssignmentModal({
  isOpen,
  onClose,
  onSaved,
  project,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  project: AdminProject | null;
}) {
  const [jury, setJury] = useState<AdminUser[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setIsLoading(true);
    setError(null);

    void fetchAdminUsers({ role: 'jury' })
      .then(setJury)
      .catch((loadError) =>
        setError(getApiErrorMessage(loadError, 'Не удалось загрузить жюри')),
      )
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  const toggle = (userId: string) => {
    setSelectedIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  };

  const handleSubmit = async () => {
    if (!project) {
      return;
    }

    setIsSubmitting(true);

    try {
      await assignProjectJury(project.id, selectedIds);
      onSaved();
      onClose();
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, 'Не удалось назначить жюри'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <V2Modal
      footer={
        <>
          <V2Button onClick={onClose} variant="secondary">
            Отмена
          </V2Button>
          <V2Button isLoading={isSubmitting} onClick={() => void handleSubmit()}>
            Назначить
          </V2Button>
        </>
      }
      isOpen={isOpen}
      onClose={onClose}
      title="Назначение жюри"
    >
      {isLoading ? (
        <V2Loader />
      ) : error ? (
        <V2ErrorState message={error} />
      ) : jury.length ? (
        <div className="v2-check-list">
          {jury.map((item) => (
            <label key={item.id}>
              <input
                checked={selectedIds.includes(item.id)}
                onChange={() => toggle(item.id)}
                type="checkbox"
              />
              <span>{item.fullName}</span>
            </label>
          ))}
        </div>
      ) : (
        <V2EmptyState title="Жюри не найдены" />
      )}
    </V2Modal>
  );
}

export function ProjectsPage() {
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [filters, setFilters] = useState({
    course: '',
    direction: '',
    search: '',
    status: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProject, setEditingProject] = useState<AdminProject | null>(null);
  const [assigningProject, setAssigningProject] = useState<AdminProject | null>(null);

  const loadProjects = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [projectRows, directionRows] = await Promise.all([
        fetchAdminProjects(filters),
        fetchDirections(),
      ]);
      setProjects(projectRows);
      setDirections(directionRows);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, 'Не удалось загрузить проекты'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadProjects();
  }, []);

  const filteredProjects = useMemo(() => {
    const query = filters.search.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesStatus = filters.status ? project.status === filters.status : true;
      const matchesDirection = filters.direction
        ? project.directionId === filters.direction ||
          project.directionName === filters.direction
        : true;
      const matchesCourse = filters.course
        ? String(project.course ?? '') === filters.course
        : true;
      const matchesSearch = query
        ? `${project.teamName} ${project.title}`.toLowerCase().includes(query)
        : true;

      return matchesStatus && matchesDirection && matchesCourse && matchesSearch;
    });
  }, [filters, projects]);

  return (
    <div className="v2-stack">
      <SectionToolbar>
        <V2Select
          label="Статус"
          onValueChange={(status) => setFilters({ ...filters, status })}
          options={statusOptions}
          placeholder="Все статусы"
          value={filters.status}
        />
        <V2Select
          label="Направление"
          onValueChange={(direction) => setFilters({ ...filters, direction })}
          options={directions.map((direction) => ({
            label: direction.name,
            value: direction.id,
          }))}
          placeholder="Все направления"
          value={filters.direction}
        />
        <V2Input
          label="Курс"
          onChange={(event) => setFilters({ ...filters, course: event.target.value })}
          placeholder="1, 2..."
          value={filters.course}
        />
        <V2Input
          label="Поиск"
          onChange={(event) => setFilters({ ...filters, search: event.target.value })}
          placeholder="Команда или проект"
          value={filters.search}
        />
      </SectionToolbar>

      {isLoading ? (
        <V2Loader />
      ) : error ? (
        <V2ErrorState action={<V2Button onClick={() => void loadProjects()}>Повторить</V2Button>} message={error} />
      ) : (
        <V2Table
          columns={[
            { header: 'Команда', render: (project) => project.teamName },
            { header: 'Проект', render: (project) => project.title },
            {
              header: 'Направление',
              render: (project) =>
                project.customDirectionName ?? project.directionName ?? 'Не указано',
            },
            {
              header: 'Статус',
              render: (project) => (
                <V2Badge tone={projectStatusTone(project.status)}>{project.status}</V2Badge>
              ),
            },
            {
              header: 'Жюри',
              render: (project) =>
                project.jury?.length ? project.jury.join(', ') : 'Не назначены',
            },
            {
              header: 'Действия',
              render: (project) => (
                <div className="v2-table-actions">
                  <V2Button
                    onClick={() =>
                      navigateTo(buildProjectPath(V2_ROUTES.admin.projects, project.id))
                    }
                    variant="secondary"
                  >
                    Детали
                  </V2Button>
                  <V2Button onClick={() => setEditingProject(project)} variant="secondary">
                    Редактировать
                  </V2Button>
                  <V2Button onClick={() => setAssigningProject(project)} variant="secondary">
                    Назначить жюри
                  </V2Button>
                </div>
              ),
            },
          ]}
          emptyText="Проекты не найдены"
          rows={filteredProjects}
        />
      )}

      <ProjectEditModal
        initialProject={editingProject}
        isOpen={Boolean(editingProject)}
        onClose={() => setEditingProject(null)}
        onSaved={() => void loadProjects()}
      />
      <JuryAssignmentModal
        isOpen={Boolean(assigningProject)}
        onClose={() => setAssigningProject(null)}
        onSaved={() => void loadProjects()}
        project={assigningProject}
      />
    </div>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value?: ReactNode;
}) {
  return (
    <div className="v2-detail-item">
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  );
}

export function ProjectDetailsPage({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<AdminProject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const loadProject = async () => {
    setIsLoading(true);
    setError(null);

    try {
      setProject(await fetchAdminProject(projectId));
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, 'Не удалось загрузить проект'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadProject();
  }, [projectId]);

  if (isLoading) {
    return <V2Loader />;
  }

  if (error || !project) {
    return <V2ErrorState message={error ?? 'Проект не найден'} />;
  }

  return (
    <div className="v2-stack">
      <section className="v2-panel">
        <div className="v2-panel-head">
          <div>
            <h2>{project.title}</h2>
            <p>{project.teamName}</p>
          </div>
          <V2Button onClick={() => setIsEditOpen(true)}>Редактировать</V2Button>
        </div>
        <div className="v2-detail-grid">
          <DetailItem label="Команда" value={project.teamName} />
          <DetailItem
            label="Состав"
            value={
              project.teamMembers?.length
                ? project.teamMembers.map((member) => member.fullName).join(', ')
                : '-'
            }
          />
          <DetailItem
            label="Направление"
            value={project.customDirectionName ?? project.directionName}
          />
          <DetailItem
            label="Статус"
            value={<V2Badge tone={projectStatusTone(project.status)}>{project.status}</V2Badge>}
          />
          <DetailItem label="Краткое описание" value={project.shortDescription} />
          <DetailItem label="Проблема" value={project.problem} />
          <DetailItem label="Решение" value={project.solution} />
          <DetailItem label="Целевая аудитория" value={project.targetAudience} />
          <DetailItem
            label="MVP"
            value={project.mvpUrl ? <a href={project.mvpUrl}>{project.mvpUrl}</a> : '-'}
          />
          <DetailItem
            label="Презентация"
            value={
              project.presentationUrl ? (
                <a href={project.presentationUrl}>{project.presentationUrl}</a>
              ) : (
                '-'
              )
            }
          />
          <DetailItem
            label="GitHub"
            value={project.githubUrl ? <a href={project.githubUrl}>{project.githubUrl}</a> : '-'}
          />
          <DetailItem
            label="YouTube"
            value={project.youtubeUrl ? <a href={project.youtubeUrl}>{project.youtubeUrl}</a> : '-'}
          />
          <DetailItem
            label="Назначенные жюри"
            value={project.jury?.length ? project.jury.join(', ') : 'Не назначены'}
          />
          <DetailItem label="Кол-во оценок" value={project.scoresCount ?? 0} />
          <DetailItem label="Итоговый балл" value={<ScoreValue value={project.totalScore} />} />
        </div>
      </section>
      <ProjectEditModal
        initialProject={project}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSaved={() => void loadProject()}
      />
    </div>
  );
}

function CriteriaFormModal({
  initialCriterion,
  isOpen,
  onClose,
  onSaved,
}: {
  initialCriterion?: Criterion | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<CriterionPayload>({
    description: '',
    isActive: true,
    isRequired: true,
    maxScore: 10,
    order: 0,
    title: '',
    weight: 1,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setForm({
      description: initialCriterion?.description ?? '',
      isActive: initialCriterion?.isActive ?? true,
      isRequired: initialCriterion?.isRequired ?? true,
      maxScore: initialCriterion?.maxScore ?? 10,
      order: initialCriterion?.order ?? 0,
      title: initialCriterion?.title ?? '',
      weight: initialCriterion?.weight ?? 1,
    });
    setError(null);
  }, [initialCriterion, isOpen]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (initialCriterion) {
        await updateCriterion(initialCriterion.id, form);
      } else {
        await createCriterion(form);
      }

      onSaved();
      onClose();
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, 'Не удалось сохранить критерий'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <V2Modal
      footer={
        <>
          <V2Button onClick={onClose} variant="secondary">
            Отмена
          </V2Button>
          <V2Button form="v2-criteria-form" isLoading={isSubmitting} type="submit">
            Сохранить
          </V2Button>
        </>
      }
      isOpen={isOpen}
      onClose={onClose}
      title={initialCriterion ? 'Редактирование критерия' : 'Создание критерия'}
    >
      <form className="v2-form" id="v2-criteria-form" onSubmit={handleSubmit}>
        <V2Input
          disabled={isSubmitting}
          label="Название"
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          value={form.title}
        />
        <V2Textarea
          disabled={isSubmitting}
          label="Описание"
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          value={form.description ?? ''}
        />
        <div className="v2-form-grid">
          <V2Input
            disabled={isSubmitting}
            label="Максимальный балл"
            min={0}
            onChange={(event) =>
              setForm({ ...form, maxScore: Number(event.target.value) })
            }
            type="number"
            value={form.maxScore}
          />
          <V2Input
            disabled={isSubmitting}
            label="Вес"
            min={0}
            onChange={(event) => setForm({ ...form, weight: Number(event.target.value) })}
            step={0.1}
            type="number"
            value={form.weight}
          />
          <V2Input
            disabled={isSubmitting}
            label="Порядок"
            min={0}
            onChange={(event) => setForm({ ...form, order: Number(event.target.value) })}
            type="number"
            value={form.order}
          />
        </div>
        <div className="v2-check-list v2-check-list--inline">
          <label>
            <input
              checked={form.isRequired}
              onChange={(event) =>
                setForm({ ...form, isRequired: event.target.checked })
              }
              type="checkbox"
            />
            <span>Обязательный</span>
          </label>
          <label>
            <input
              checked={form.isActive}
              onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
              type="checkbox"
            />
            <span>Активен</span>
          </label>
        </div>
        {error && <p className="v2-form-alert">{error}</p>}
      </form>
    </V2Modal>
  );
}

export function CriteriaPage() {
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingCriterion, setEditingCriterion] = useState<Criterion | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Criterion | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  const loadCriteria = async () => {
    setIsLoading(true);
    setError(null);

    try {
      setCriteria(await fetchCriteria());
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, 'Не удалось загрузить критерии'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCriteria();
  }, []);

  const handleArchive = async () => {
    if (!archiveTarget) {
      return;
    }

    setIsArchiving(true);

    try {
      await archiveCriterion(archiveTarget.id);
      setArchiveTarget(null);
      await loadCriteria();
    } catch (archiveError) {
      setError(getApiErrorMessage(archiveError, 'Не удалось архивировать критерий'));
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <div className="v2-stack">
      <SectionToolbar>
        <V2Button
          onClick={() => {
            setEditingCriterion(null);
            setIsFormOpen(true);
          }}
        >
          Создать критерий
        </V2Button>
      </SectionToolbar>
      {isLoading ? (
        <V2Loader />
      ) : error ? (
        <V2ErrorState action={<V2Button onClick={() => void loadCriteria()}>Повторить</V2Button>} message={error} />
      ) : (
        <V2Table
          columns={[
            { header: 'Название', render: (criterion) => criterion.title },
            { header: 'Максимум', render: (criterion) => criterion.maxScore },
            { header: 'Вес', render: (criterion) => criterion.weight },
            { header: 'Порядок', render: (criterion) => criterion.order },
            {
              header: 'Статус',
              render: (criterion) => (
                <V2Badge tone={criterion.isActive ? 'success' : 'neutral'}>
                  {criterion.isActive ? 'active' : 'archived'}
                </V2Badge>
              ),
            },
            {
              header: 'Действия',
              render: (criterion) => (
                <div className="v2-table-actions">
                  <V2Button
                    onClick={() => {
                      setEditingCriterion(criterion);
                      setIsFormOpen(true);
                    }}
                    variant="secondary"
                  >
                    Редактировать
                  </V2Button>
                  <V2Button onClick={() => setArchiveTarget(criterion)} variant="danger">
                    Архивировать
                  </V2Button>
                </div>
              ),
            },
          ]}
          emptyText="Критерии не найдены"
          rows={criteria}
        />
      )}
      <CriteriaFormModal
        initialCriterion={editingCriterion}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSaved={() => void loadCriteria()}
      />
      <V2ConfirmModal
        confirmLabel="Архивировать"
        isLoading={isArchiving}
        isOpen={Boolean(archiveTarget)}
        message="Критерий будет скрыт из активной оценки."
        onCancel={() => setArchiveTarget(null)}
        onConfirm={() => void handleArchive()}
        title="Архивирование критерия"
      />
    </div>
  );
}

function NominationFormModal({
  initialNomination,
  isOpen,
  onClose,
  onSaved,
  projects,
}: {
  initialNomination?: Nomination | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  projects: AdminProject[];
}) {
  const [form, setForm] = useState<NominationPayload>({
    description: '',
    title: '',
    winnerProjectId: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setForm({
      description: initialNomination?.description ?? '',
      title: initialNomination?.title ?? '',
      winnerProjectId: initialNomination?.winnerProjectId ?? '',
    });
    setError(null);
  }, [initialNomination, isOpen]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (initialNomination) {
        await updateNomination(initialNomination.id, form);
      } else {
        await createNomination(form);
      }

      onSaved();
      onClose();
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, 'Не удалось сохранить номинацию'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <V2Modal
      footer={
        <>
          <V2Button onClick={onClose} variant="secondary">
            Отмена
          </V2Button>
          <V2Button form="v2-nomination-form" isLoading={isSubmitting} type="submit">
            Сохранить
          </V2Button>
        </>
      }
      isOpen={isOpen}
      onClose={onClose}
      title={initialNomination ? 'Редактирование номинации' : 'Создание номинации'}
    >
      <form className="v2-form" id="v2-nomination-form" onSubmit={handleSubmit}>
        <V2Input
          disabled={isSubmitting}
          label="Название"
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          value={form.title}
        />
        <V2Textarea
          disabled={isSubmitting}
          label="Описание"
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          value={form.description ?? ''}
        />
        <V2Select
          disabled={isSubmitting}
          label="Проект-победитель"
          onValueChange={(winnerProjectId) => setForm({ ...form, winnerProjectId })}
          options={projects.map((project) => ({
            label: `${project.teamName} - ${project.title}`,
            value: project.id,
          }))}
          placeholder="Не выбран"
          value={form.winnerProjectId ?? ''}
        />
        {error && <p className="v2-form-alert">{error}</p>}
      </form>
    </V2Modal>
  );
}

export function NominationsPage() {
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingNomination, setEditingNomination] = useState<Nomination | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [nominationRows, projectRows] = await Promise.all([
        fetchNominations(),
        fetchAdminProjects(),
      ]);
      setNominations(nominationRows);
      setProjects(projectRows);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, 'Не удалось загрузить номинации'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  return (
    <div className="v2-stack">
      <SectionToolbar>
        <V2Button
          onClick={() => {
            setEditingNomination(null);
            setIsFormOpen(true);
          }}
        >
          Создать номинацию
        </V2Button>
      </SectionToolbar>
      {isLoading ? (
        <V2Loader />
      ) : error ? (
        <V2ErrorState action={<V2Button onClick={() => void loadData()}>Повторить</V2Button>} message={error} />
      ) : (
        <V2Table
          columns={[
            { header: 'Название', render: (nomination) => nomination.title },
            { header: 'Описание', render: (nomination) => nomination.description ?? '-' },
            {
              header: 'Победитель',
              render: (nomination) => {
                const winner = projects.find(
                  (project) => project.id === nomination.winnerProjectId,
                );

                return winner ? `${winner.teamName} - ${winner.title}` : 'Не выбран';
              },
            },
            {
              header: 'Действия',
              render: (nomination) => (
                <V2Button
                  onClick={() => {
                    setEditingNomination(nomination);
                    setIsFormOpen(true);
                  }}
                  variant="secondary"
                >
                  Редактировать
                </V2Button>
              ),
            },
          ]}
          emptyText="Номинации не найдены"
          rows={nominations}
        />
      )}
      <NominationFormModal
        initialNomination={editingNomination}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSaved={() => void loadData()}
        projects={projects}
      />
    </div>
  );
}

export function ResultsPage() {
  const [results, setResults] = useState<ResultRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [published, setPublished] = useState(false);

  const loadResults = async () => {
    setIsLoading(true);
    setError(null);

    try {
      setResults(await fetchResults());
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, 'Не удалось загрузить результаты'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadResults();
  }, []);

  const handlePublish = async () => {
    setIsPublishing(true);

    try {
      await publishResults();
      setPublished(true);
      setIsConfirmOpen(false);
    } catch (publishError) {
      setError(getApiErrorMessage(publishError, 'Не удалось опубликовать результаты'));
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="v2-stack">
      <SectionToolbar>
        <V2Badge tone={published ? 'success' : 'warning'}>
          {published ? 'Опубликованы' : 'Не опубликованы'}
        </V2Badge>
        <V2Button onClick={() => setIsConfirmOpen(true)}>
          Опубликовать результаты
        </V2Button>
      </SectionToolbar>
      {isLoading ? (
        <V2Loader />
      ) : error ? (
        <V2ErrorState action={<V2Button onClick={() => void loadResults()}>Повторить</V2Button>} message={error} />
      ) : (
        <V2Table
          columns={[
            { header: 'Место', render: (row) => row.place },
            { header: 'Команда', render: (row) => row.teamName },
            { header: 'Проект', render: (row) => row.projectTitle },
            { header: 'Направление', render: (row) => row.directionName ?? '-' },
            { header: 'Итоговый балл', render: (row) => row.totalScore },
            { header: 'Кол-во оценок', render: (row) => row.scoresCount },
          ]}
          emptyText="Результаты не найдены"
          rows={[...results].sort((left, right) => right.totalScore - left.totalScore)}
        />
      )}
      <V2ConfirmModal
        confirmLabel="Опубликовать"
        isLoading={isPublishing}
        isOpen={isConfirmOpen}
        message="После публикации участники смогут увидеть публичные результаты."
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={() => void handlePublish()}
        title="Публикация результатов"
      />
    </div>
  );
}

export function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadAnalytics = async () => {
    setIsLoading(true);
    setError(null);

    try {
      setAnalytics(await fetchAnalytics());
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, 'Не удалось загрузить аналитику'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAnalytics();
  }, []);

  if (isLoading) {
    return <V2Loader />;
  }

  if (error || !analytics) {
    return <V2ErrorState action={<V2Button onClick={() => void loadAnalytics()}>Повторить</V2Button>} message={error ?? undefined} />;
  }

  return (
    <div className="v2-stack">
      <MetricGrid
        items={[
          { label: 'Всего проектов', value: analytics.totalProjects },
          { label: 'Отправлено', value: analytics.submittedProjects },
          { label: 'Черновики', value: analytics.draftProjects },
          { label: 'Оценено', value: analytics.evaluatedProjects },
          { label: 'Без оценки', value: analytics.notEvaluatedProjects },
        ]}
      />
      <div className="v2-two-columns">
        <section className="v2-panel">
          <h2>Проекты по направлениям</h2>
          <V2Table
            columns={[
              { header: 'Направление', render: (row) => row.name },
              { header: 'Количество', render: (row) => row.count },
            ]}
            rows={analytics.projectsByDirection}
          />
        </section>
        <section className="v2-panel">
          <h2>Проекты по курсам</h2>
          <V2Table
            columns={[
              { header: 'Курс', render: (row) => row.name },
              { header: 'Количество', render: (row) => row.count },
            ]}
            rows={analytics.projectsByCourse}
          />
        </section>
      </div>
      <section className="v2-panel">
        <h2>Прогресс жюри</h2>
        <V2Table
          columns={[
            { header: 'Жюри', render: (row) => row.name },
            { header: 'Назначено', render: (row) => row.assigned },
            { header: 'Оценено', render: (row) => row.evaluated },
          ]}
          rows={analytics.juryProgress}
        />
      </section>
    </div>
  );
}
