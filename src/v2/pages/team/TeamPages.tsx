import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  V2Badge,
  V2Button,
  V2ConfirmModal,
  V2EmptyState,
  V2ErrorState,
  V2Input,
  V2Loader,
  V2Select,
  V2Textarea,
} from '../../components/common';
import {
  createEmptyProject,
  createEmptyTeam,
  fetchParticipantDirections,
  fetchParticipantProject,
  fetchTeam,
  fetchTeamResults,
  getProjectDirectionLabel,
  saveParticipantProject,
  saveTeam,
  submitParticipantProject,
} from '../../services/teamService';
import { fieldErrorsFromApiError, getApiErrorMessage } from '../../services/apiClient';
import type {
  Direction,
  Project,
  ProjectFormPayload,
  Team,
  TeamResults,
} from '../../types';
import { V2_ROUTES, navigateTo } from '../../utils/routes';
import {
  hasErrors,
  validateProject,
  validateTeam,
  type FieldErrors,
} from '../../utils/validators';

function StatusCard({
  label,
  tone,
  value,
}: {
  label: string;
  tone: 'danger' | 'info' | 'neutral' | 'success' | 'warning';
  value: string;
}) {
  return (
    <article className="v2-status-card">
      <span>{label}</span>
      <V2Badge tone={tone}>{value}</V2Badge>
    </article>
  );
}

function isProjectLocked(project: Project | null) {
  return Boolean(
    project &&
      ['submitted', 'under_review', 'evaluated', 'published'].includes(project.status),
  );
}

function projectToForm(project: Project | null): ProjectFormPayload {
  if (!project) {
    return createEmptyProject();
  }

  return {
    customDirectionName: project.customDirectionName ?? '',
    directionId: project.directionId ?? '',
    directionName: project.directionName ?? '',
    githubUrl: project.githubUrl ?? '',
    mvpUrl: project.mvpUrl ?? '',
    presentationUrl: project.presentationUrl,
    problem: project.problem,
    shortDescription: project.shortDescription,
    solution: project.solution,
    targetAudience: project.targetAudience,
    title: project.title,
    youtubeUrl: project.youtubeUrl ?? '',
  };
}

export function TeamDashboardPage() {
  const [team, setTeam] = useState<Team | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void Promise.all([fetchTeam(), fetchParticipantProject()])
      .then(([teamData, projectData]) => {
        setTeam(teamData);
        setProject(projectData);
      })
      .catch((loadError) =>
        setError(getApiErrorMessage(loadError, 'Не удалось загрузить кабинет')),
      )
      .finally(() => setIsLoading(false));
  }, []);

  const teamComplete = Boolean(team?.name && team.members.length);
  const projectComplete = Boolean(
    project?.title &&
      project.shortDescription &&
      project.problem &&
      project.solution &&
      project.targetAudience &&
      project.presentationUrl,
  );
  const submitted = Boolean(project && project.status !== 'draft');

  if (isLoading) {
    return <V2Loader />;
  }

  if (error) {
    return <V2ErrorState message={error} />;
  }

  return (
    <div className="v2-stack">
      <div className="v2-metric-grid">
        <StatusCard
          label="Команда"
          tone={teamComplete ? 'success' : 'warning'}
          value={teamComplete ? 'Заполнена' : 'Требует заполнения'}
        />
        <StatusCard
          label="Проект"
          tone={projectComplete ? 'success' : 'warning'}
          value={projectComplete ? 'Заполнен' : 'Требует заполнения'}
        />
        <StatusCard
          label="Отправка"
          tone={submitted ? 'success' : 'neutral'}
          value={submitted ? 'Отправлен' : 'Черновик'}
        />
      </div>
      {(!teamComplete || !projectComplete) && (
        <section className="v2-panel v2-panel--warning">
          <h2>Заполните обязательные поля</h2>
          <p>
            {!teamComplete
              ? 'Профиль команды требует заполнения. '
              : ''}
            {!projectComplete ? 'Карточка проекта требует заполнения.' : ''}
          </p>
        </section>
      )}
      <section className="v2-panel">
        <h2>{project?.title || 'Проект пока не создан'}</h2>
        <p className="v2-muted">
          {project ? getProjectDirectionLabel(project) : 'Добавьте проект и сохраните черновик.'}
        </p>
        <V2Button onClick={() => navigateTo(V2_ROUTES.team.project)}>
          Перейти к проекту
        </V2Button>
      </section>
    </div>
  );
}

export function TeamProfilePage() {
  const [team, setTeam] = useState<Team>(createEmptyTeam);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void fetchTeam()
      .then(setTeam)
      .catch(() => setTeam(createEmptyTeam()))
      .finally(() => setIsLoading(false));
  }, []);

  const updateMember = (
    index: number,
    field: keyof Team['members'][number],
    value: string | number,
  ) => {
    setTeam((current) => ({
      ...current,
      members: current.members.map((member, memberIndex) =>
        memberIndex === index ? { ...member, [field]: value } : member,
      ),
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationErrors = validateTeam(team);
    setErrors(validationErrors);
    setError(null);
    setSuccess(null);

    if (hasErrors(validationErrors)) {
      return;
    }

    setIsSubmitting(true);

    try {
      setTeam(await saveTeam(team));
      setSuccess('Данные успешно сохранены');
    } catch (submitError) {
      setErrors(fieldErrorsFromApiError(submitError));
      setError(getApiErrorMessage(submitError, 'Не удалось сохранить команду'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <V2Loader />;
  }

  return (
    <form className="v2-stack" onSubmit={handleSubmit}>
      <section className="v2-panel v2-panel--highlight">
        <V2Input
          autoFocus
          disabled={isSubmitting}
          error={errors.name}
          label="🚀 Как называется ваша команда?"
          onChange={(event) => setTeam({ ...team, name: event.target.value })}
          placeholder="Придумайте яркое и запоминающееся название"
          style={{ fontSize: '1.1rem', fontWeight: 600 }}
          value={team.name}
        />
        <p className="v2-muted" style={{ marginTop: 10, fontSize: '0.95rem' }}>
          Убедитесь, что вы заполнили это поле. Название команды будет видно всем жюри и участникам.
        </p>
      </section>
      <section className="v2-panel">
        <div className="v2-panel-head">
          <h2>Состав команды</h2>
          <V2Button
            onClick={() =>
              setTeam({
                ...team,
                members: [
                  ...team.members,
                  {
                    contact: '',
                    course: 1,
                    fullName: '',
                    group: '',
                    roleInTeam: '',
                  },
                ],
              })
            }
            variant="secondary"
          >
            Добавить участника
          </V2Button>
        </div>
        {errors.members && <p className="v2-form-alert">{errors.members}</p>}
        <div className="v2-members">
          {team.members.map((member, index) => (
            <article className="v2-member-row" key={index}>
              <V2Input
                disabled={isSubmitting}
                error={errors[`members.${index}.fullName`]}
                label="ФИО"
                onChange={(event) => updateMember(index, 'fullName', event.target.value)}
                value={member.fullName}
              />
              <V2Input
                disabled={isSubmitting}
                error={errors[`members.${index}.course`]}
                label="Курс"
                max={3}
                min={1}
                onChange={(event) => {
                  const val = Number(event.target.value);
                  if (val >= 1 && val <= 3) updateMember(index, 'course', val);
                }}
                type="number"
                value={member.course}
              />
              <V2Input
                disabled={isSubmitting}
                label="Группа"
                onChange={(event) => updateMember(index, 'group', event.target.value)}
                value={member.group ?? ''}
              />
              <V2Input
                disabled={isSubmitting}
                label="Роль в команде"
                onChange={(event) => updateMember(index, 'roleInTeam', event.target.value)}
                value={member.roleInTeam ?? ''}
              />
              <V2Input
                disabled={isSubmitting}
                label="Контакт (необязательно)"
                onChange={(event) => updateMember(index, 'contact', event.target.value)}
                value={member.contact ?? ''}
              />
              <V2Button
                disabled={team.members.length <= 1 || isSubmitting}
                onClick={() =>
                  setTeam({
                    ...team,
                    members: team.members.filter((_, memberIndex) => memberIndex !== index),
                  })
                }
                variant="danger"
              >
                Удалить
              </V2Button>
            </article>
          ))}
        </div>
      </section>
      {error && <p className="v2-form-alert">{error}</p>}
      {success && <p className="v2-form-success">{success}</p>}
      <div className="v2-submit-row">
        <V2Button isLoading={isSubmitting} type="submit">
          Сохранить команду
        </V2Button>
      </div>
    </form>
  );
}

function DirectionSelect({
  directions,
  disabled,
  errors,
  project,
  setProject,
}: {
  directions: Direction[];
  disabled: boolean;
  errors: FieldErrors;
  project: ProjectFormPayload;
  setProject: (project: ProjectFormPayload) => void;
}) {
  const value = project.customDirectionName ? '__other' : project.directionId ?? '';

  return (
    <div className="v2-form-grid">
      <V2Select
        disabled={disabled}
        error={errors.direction}
        label="Направление"
        onValueChange={(directionId) => {
          if (directionId === '__other') {
            setProject({
              ...project,
              customDirectionName: project.customDirectionName || '',
              directionId: '',
              directionName: '',
            });
            return;
          }

          const direction = directions.find((item) => item.id === directionId);
          setProject({
            ...project,
            customDirectionName: '',
            directionId,
            directionName: direction?.name ?? '',
          });
        }}
        options={[
          ...directions.map((direction) => ({
            label: direction.name,
            value: direction.id,
          })),
          { label: 'Другое', value: '__other' },
        ]}
        placeholder="Выберите направление"
        value={value}
      />
      {value === '__other' && (
        <V2Input
          disabled={disabled}
          error={errors.direction}
          label="Свое направление"
          onChange={(event) =>
            setProject({ ...project, customDirectionName: event.target.value })
          }
          value={project.customDirectionName ?? ''}
        />
      )}
    </div>
  );
}

export function ProjectFormPage() {
  const [project, setProject] = useState<ProjectFormPayload>(createEmptyProject);
  const [savedProject, setSavedProject] = useState<Project | null>(null);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const locked = isProjectLocked(savedProject);

  useEffect(() => {
    void Promise.all([fetchParticipantProject(), fetchParticipantDirections()])
      .then(([projectData, directionRows]) => {
        setSavedProject(projectData);
        setProject(projectToForm(projectData));
        setDirections(directionRows);
      })
      .catch((loadError) =>
        setError(getApiErrorMessage(loadError, 'Не удалось загрузить проект')),
      )
      .finally(() => setIsLoading(false));
  }, []);

  const validate = () => {
    const validationErrors = validateProject(project);
    setErrors(validationErrors);
    return !hasErrors(validationErrors);
  };

  const saveDraft = async () => {
    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const nextProject = await saveParticipantProject(project);
      setSavedProject(nextProject);
      setProject(projectToForm(nextProject));
      setSuccess('Данные успешно сохранены');
    } catch (submitError) {
      setErrors(fieldErrorsFromApiError(submitError));
      setError(getApiErrorMessage(submitError, 'Не удалось сохранить проект'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitProject = async () => {
    if (!validate()) {
      setIsSubmitModalOpen(false);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await saveParticipantProject(project);
      const nextProject = await submitParticipantProject();
      setSavedProject(nextProject);
      setProject(projectToForm(nextProject));
      setSuccess('Проект отправлен');
      setIsSubmitModalOpen(false);
    } catch (submitError) {
      setErrors(fieldErrorsFromApiError(submitError));
      setError(getApiErrorMessage(submitError, 'Не удалось отправить проект'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <V2Loader />;
  }

  return (
    <div className="v2-stack">
      {savedProject && (
        <section className="v2-panel v2-panel--compact">
          <V2Badge tone={projectStatusTone(savedProject.status)}>
            {savedProject.status}
          </V2Badge>
        </section>
      )}
      <form className="v2-panel v2-form" onSubmit={(event) => event.preventDefault()}>
        <V2Input
          disabled={locked || isSubmitting}
          error={errors.title}
          label="Название проекта"
          onChange={(event) => setProject({ ...project, title: event.target.value })}
          value={project.title}
        />
        <DirectionSelect
          directions={directions}
          disabled={locked || isSubmitting}
          errors={errors}
          project={project}
          setProject={setProject}
        />
        <V2Textarea
          disabled={locked || isSubmitting}
          error={errors.shortDescription}
          label="Краткое описание проекта"
          onChange={(event) =>
            setProject({ ...project, shortDescription: event.target.value })
          }
          value={project.shortDescription}
        />
        <V2Textarea
          disabled={locked || isSubmitting}
          error={errors.problem}
          label="Проблема"
          onChange={(event) => setProject({ ...project, problem: event.target.value })}
          value={project.problem}
        />
        <V2Textarea
          disabled={locked || isSubmitting}
          error={errors.solution}
          label="Решение"
          onChange={(event) => setProject({ ...project, solution: event.target.value })}
          value={project.solution}
        />
        <V2Input
          disabled={locked || isSubmitting}
          error={errors.targetAudience}
          label="Целевая аудитория"
          onChange={(event) =>
            setProject({ ...project, targetAudience: event.target.value })
          }
          value={project.targetAudience}
        />
        <div className="v2-form-grid">
          <V2Input
            disabled={locked || isSubmitting}
            error={errors.mvpUrl}
            label="MVP (необязательно)"
            onChange={(event) => setProject({ ...project, mvpUrl: event.target.value })}
            value={project.mvpUrl ?? ''}
          />
          <V2Input
            disabled={locked || isSubmitting}
            error={errors.presentationUrl}
            label="Презентация"
            onChange={(event) =>
              setProject({ ...project, presentationUrl: event.target.value })
            }
            value={project.presentationUrl}
          />
          <V2Input
            disabled={locked || isSubmitting}
            error={errors.githubUrl}
            label="GitHub (необязательно)"
            onChange={(event) =>
              setProject({ ...project, githubUrl: event.target.value })
            }
            value={project.githubUrl ?? ''}
          />
          <V2Input
            disabled={locked || isSubmitting}
            error={errors.youtubeUrl}
            label="YouTube-видео (необязательно)"
            onChange={(event) =>
              setProject({ ...project, youtubeUrl: event.target.value })
            }
            value={project.youtubeUrl ?? ''}
          />
        </div>
        {locked && (
          <p className="v2-muted">Редактирование заблокировано после отправки.</p>
        )}
        {error && <p className="v2-form-alert">{error}</p>}
        {success && <p className="v2-form-success">{success}</p>}
        <div className="v2-submit-row">
          <V2Button
            disabled={locked}
            isLoading={isSubmitting}
            onClick={() => void saveDraft()}
            variant="secondary"
          >
            Сохранить черновик
          </V2Button>
          <V2Button
            disabled={locked}
            isLoading={isSubmitting}
            onClick={() => setIsSubmitModalOpen(true)}
          >
            Отправить проект
          </V2Button>
        </div>
      </form>
      <V2ConfirmModal
        confirmLabel="Отправить"
        isLoading={isSubmitting}
        isOpen={isSubmitModalOpen}
        message="Вы уверены, что хотите отправить проект?"
        onCancel={() => setIsSubmitModalOpen(false)}
        onConfirm={() => void submitProject()}
        title="Отправка проекта"
      />
    </div>
  );
}

function projectStatusTone(status: string) {
  if (status === 'published' || status === 'evaluated' || status === 'submitted') {
    return 'success' as const;
  }

  if (status === 'rejected') {
    return 'danger' as const;
  }

  if (status === 'under_review') {
    return 'warning' as const;
  }

  return 'neutral' as const;
}

export function TeamResultsPage() {
  const [results, setResults] = useState<TeamResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void fetchTeamResults()
      .then(setResults)
      .catch((loadError) =>
        setError(getApiErrorMessage(loadError, 'Не удалось загрузить результаты')),
      )
      .finally(() => setIsLoading(false));
  }, []);

  const nominations = useMemo(() => results?.nominations ?? [], [results]);

  if (isLoading) {
    return <V2Loader />;
  }

  if (error) {
    return <V2ErrorState message={error} />;
  }

  if (!results?.published) {
    return <V2EmptyState title="Результаты пока не опубликованы" />;
  }

  return (
    <div className="v2-stack">
      <MetricGrid
        items={[
          { label: 'Место команды', value: results.place ?? '-' },
          { label: 'Публичный итог', value: results.publicTotal ?? '-' },
        ]}
      />
      <section className="v2-panel">
        <h2>Номинации</h2>
        {nominations.length ? (
          <div className="v2-chip-list">
            {nominations.map((nomination) => (
              <V2Badge key={nomination} tone="success">
                {nomination}
              </V2Badge>
            ))}
          </div>
        ) : (
          <p className="v2-muted">Номинаций нет</p>
        )}
      </section>
    </div>
  );
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
