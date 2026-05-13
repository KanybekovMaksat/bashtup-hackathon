/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react';
import {
  V2Badge,
  V2Button,
  V2ConfirmModal,
  V2EmptyState,
  V2ErrorState,
  V2Loader,
} from '../../components/common';
import {
  fetchJuryProject,
  fetchJuryProjects,
  fetchJuryScore,
  saveJuryScore,
  submitJuryScore,
} from '../../services/juryService';
import { getApiErrorMessage } from '../../services/apiClient';
import type { Criterion, JuryProject, Score, ScoreItem } from '../../types';
import { V2_ROUTES, buildProjectPath, navigateTo } from '../../utils/routes';
import { hasErrors, validateScore } from '../../utils/validators';

function scoreStatusTone(status: JuryProject['myScoreStatus'] | Score['status']) {
  if (status === 'submitted') {
    return 'success' as const;
  }

  if (status === 'draft') {
    return 'warning' as const;
  }

  return 'neutral' as const;
}

function scoreStatusLabel(status: JuryProject['myScoreStatus'] | Score['status']) {
  if (status === 'submitted') {
    return 'отправлено';
  }

  if (status === 'draft') {
    return 'черновик';
  }

  return 'не начато';
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

export function JuryDashboardPage() {
  const [projects, setProjects] = useState<JuryProject[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void fetchJuryProjects()
      .then(setProjects)
      .catch((loadError) =>
        setError(getApiErrorMessage(loadError, 'Не удалось загрузить проекты')),
      )
      .finally(() => setIsLoading(false));
  }, []);

  const evaluated = projects.filter((project) => project.myScoreStatus === 'submitted').length;
  const drafts = projects.filter((project) => project.myScoreStatus === 'draft').length;

  if (isLoading) {
    return <V2Loader />;
  }

  if (error) {
    return <V2ErrorState message={error} />;
  }

  return (
    <div className="v2-stack">
      <MetricGrid
        items={[
          { label: 'Назначено', value: projects.length },
          { label: 'Оценено', value: evaluated },
          { label: 'Черновики', value: drafts },
          { label: 'Осталось', value: projects.length - evaluated },
          { label: 'Дедлайн оценивания', value: 'Уточняется' },
        ]}
      />
      <section className="v2-panel">
        <h2>Проекты для оценки</h2>
        <V2Button onClick={() => navigateTo(V2_ROUTES.jury.projects)}>
          Перейти к списку проектов
        </V2Button>
      </section>
    </div>
  );
}

export function JuryProjectsPage() {
  const [projects, setProjects] = useState<JuryProject[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [scores, setScores] = useState<Map<string, Score | null>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const projectList = await fetchJuryProjects();
      setProjects(projectList);

      // Load score context for each project to get criteria + scores
      if (projectList.length > 0) {
        const contexts = await Promise.all(
          projectList.map((p) => fetchJuryScore(p.id).catch(() => null))
        );
        const scoreMap = new Map<string, Score | null>();
        contexts.forEach((ctx, i) => {
          if (ctx) {
            if (ctx.criteria.length && !criteria.length) {
              setCriteria(ctx.criteria);
            }
            scoreMap.set(projectList[i].id, ctx.score);
          }
        });
        setScores(scoreMap);
      }
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, 'Не удалось загрузить проекты'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  if (isLoading) {
    return <V2Loader />;
  }

  if (error) {
    return (
      <V2ErrorState
        action={<V2Button onClick={() => void loadData()}>Повторить</V2Button>}
        message={error}
      />
    );
  }

  if (!projects.length) {
    return <V2EmptyState title="Проекты не найдены" />;
  }

  const getScoreValue = (projectId: string, criterionId: string) => {
    const score = scores.get(projectId);
    if (!score) return '—';
    const item = score.items.find((i) => i.criterionId === criterionId);
    return item && Number.isFinite(item.value) ? String(item.value) : '—';
  };

  const linkLabels: Array<{ key: keyof JuryProject; label: string }> = [
    { key: 'mvpUrl' as keyof JuryProject, label: 'MVP' },
    { key: 'presentationUrl' as keyof JuryProject, label: 'Презентация' },
    { key: 'githubUrl' as keyof JuryProject, label: 'GitHub' },
    { key: 'youtubeUrl' as keyof JuryProject, label: 'YouTube' },
  ];

  return (
    <div className="v2-table-wrap">
      <table className="v2-table">
        <thead>
          <tr>
            <th>№</th>
            <th>Команда</th>
            <th>Проект</th>
            <th>Направление</th>
            <th>Ссылки</th>
            {criteria.map((c) => (
              <th key={c.id} title={c.description ?? c.title}>
                {c.title} (макс {c.maxScore})
              </th>
            ))}
            <th>Статус</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project, idx) => (
            <tr key={project.id}>
              <td>{idx + 1}</td>
              <td>{project.teamName}</td>
              <td>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo(buildProjectPath(V2_ROUTES.jury.projects, project.id));
                  }}
                  style={{ color: '#08766d', fontWeight: 700, textDecoration: 'none' }}
                >
                  {project.title}
                </a>
              </td>
              <td>{project.directionName ?? project.customDirectionName ?? '—'}</td>
              <td>
                <div className="v2-chip-list" style={{ margin: 0 }}>
                  {linkLabels.map(({ key, label }) => {
                    const url = project[key] as string | null | undefined;
                    return url ? (
                      <a
                        className="v2-link-chip"
                        href={url}
                        key={label}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '0.78rem', padding: '4px 8px' }}
                      >
                        {label}
                      </a>
                    ) : null;
                  })}
                </div>
              </td>
              {criteria.map((c) => (
                <td key={c.id} style={{ textAlign: 'center' }}>
                  {getScoreValue(project.id, c.id)}
                </td>
              ))}
              <td>
                <V2Badge tone={scoreStatusTone(project.myScoreStatus)}>
                  {scoreStatusLabel(project.myScoreStatus)}
                </V2Badge>
              </td>
              <td>
                <V2Button
                  onClick={() =>
                    navigateTo(`${buildProjectPath(V2_ROUTES.jury.projects, project.id)}/score`)
                  }
                  variant="secondary"
                >
                  Оценить
                </V2Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProjectDetails({
  project,
}: {
  project: JuryProject;
}) {
  const links = [
    ['MVP', project.mvpUrl],
    ['Презентация', project.presentationUrl],
    ['GitHub', project.githubUrl],
    ['YouTube', project.youtubeUrl],
  ].filter(([, url]) => Boolean(url));

  return (
    <section className="v2-panel">
      <div className="v2-panel-head">
        <div>
          <h2>{project.title}</h2>
          <p>{project.teamName}</p>
        </div>
        <V2Badge tone={scoreStatusTone(project.myScoreStatus)}>
          {scoreStatusLabel(project.myScoreStatus)}
        </V2Badge>
      </div>
      <div className="v2-detail-grid">
        <div className="v2-detail-item">
          <span>Команда</span>
          <strong>{project.teamName}</strong>
        </div>
        <div className="v2-detail-item">
          <span>Состав</span>
          <strong>
            {project.teamMembers?.length
              ? project.teamMembers.map((member) => member.fullName).join(', ')
              : '-'}
          </strong>
        </div>
        <div className="v2-detail-item">
          <span>Направление</span>
          <strong>{project.customDirectionName ?? project.directionName ?? '-'}</strong>
        </div>
        <div className="v2-detail-item">
          <span>Краткое описание</span>
          <strong>{project.shortDescription}</strong>
        </div>
        <div className="v2-detail-item">
          <span>Проблема</span>
          <strong>{project.problem}</strong>
        </div>
        <div className="v2-detail-item">
          <span>Решение</span>
          <strong>{project.solution}</strong>
        </div>
        <div className="v2-detail-item">
          <span>Целевая аудитория</span>
          <strong>{project.targetAudience}</strong>
        </div>
      </div>
      <div className="v2-chip-list">
        {links.map(([label, url]) => (
          <a className="v2-link-chip" href={url ?? '#'} key={label} target="_blank" rel="noopener noreferrer">
            {label}
          </a>
        ))}
      </div>
    </section>
  );
}

export function JuryProjectDetailsPage({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<JuryProject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void fetchJuryProject(projectId)
      .then(setProject)
      .catch((loadError) =>
        setError(getApiErrorMessage(loadError, 'Не удалось загрузить проект')),
      )
      .finally(() => setIsLoading(false));
  }, [projectId]);

  if (isLoading) {
    return <V2Loader />;
  }

  if (error || !project) {
    return <V2ErrorState message={error ?? 'Проект не найден'} />;
  }

  return (
    <div className="v2-stack">
      <ProjectDetails project={project} />
      <div className="v2-submit-row">
        <V2Button
          onClick={() =>
            navigateTo(`${buildProjectPath(V2_ROUTES.jury.projects, project.id)}/score`)
          }
        >
          Оценить проект
        </V2Button>
      </div>
    </div>
  );
}

function buildInitialItems(criteria: Criterion[], score: Score | null) {
  const byCriterion = new Map(score?.items.map((item) => [item.criterionId, item]));

  return criteria.map((criterion) => ({
    comment: byCriterion.get(criterion.id)?.comment ?? '',
    criterionId: criterion.id,
    value: byCriterion.get(criterion.id)?.value ?? NaN,
  }));
}

export function JuryScorePage({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<JuryProject | null>(null);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [score, setScore] = useState<Score | null>(null);
  const [items, setItems] = useState<ScoreItem[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    void Promise.all([fetchJuryProject(projectId), fetchJuryScore(projectId)])
      .then(([projectData, scoreContext]) => {
        setProject(projectData);
        setCriteria(scoreContext.criteria);
        setScore(scoreContext.score);
        setItems(buildInitialItems(scoreContext.criteria, scoreContext.score));
      })
      .catch((loadError) =>
        setError(getApiErrorMessage(loadError, 'Не удалось загрузить оценку')),
      )
      .finally(() => setIsLoading(false));
  }, [projectId]);

  const isLocked = score?.status === 'submitted';

  const total = useMemo(
    () =>
      items.reduce((sum, item) => {
        const value = Number.isFinite(item.value) ? item.value : 0;
        const criterion = criteria.find((entry) => entry.id === item.criterionId);
        return sum + value * (criterion?.weight ?? 1);
      }, 0),
    [criteria, items],
  );

  const updateItem = (
    criterionId: string,
    field: keyof ScoreItem,
    value: number | string,
  ) => {
    setItems((current) =>
      current.map((item) =>
        item.criterionId === criterionId ? { ...item, [field]: value } : item,
      ),
    );
  };

  const validate = () => {
    const validationErrors = validateScore(criteria, items);
    setFieldErrors(validationErrors);
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
      const nextScore = await saveJuryScore(projectId, { items });
      setScore(nextScore);
      setSuccess('Данные успешно сохранены');
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, 'Не удалось сохранить оценку'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitScore = async () => {
    if (!validate()) {
      setIsConfirmOpen(false);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const nextScore = await submitJuryScore(projectId, { items });
      setScore(nextScore);
      setSuccess('Финальная оценка отправлена');
      setIsConfirmOpen(false);
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, 'Не удалось отправить оценку'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <V2Loader />;
  }

  if (error && !project) {
    return <V2ErrorState message={error} />;
  }

  if (!project) {
    return <V2ErrorState message="Проект не найден" />;
  }

  return (
    <div className="v2-stack">
      <ProjectDetails project={project} />
      <section className="v2-panel">
        <div className="v2-panel-head">
          <div>
            <h2>Оценка проекта</h2>
            <p>Итог с весами: {total.toFixed(1)}</p>
          </div>
          <V2Badge tone={scoreStatusTone(score?.status ?? 'not_started')}>
            {scoreStatusLabel(score?.status ?? 'not_started')}
          </V2Badge>
        </div>
        {criteria.length ? (
          <div className="v2-table-wrap">
            <table className="v2-table v2-score-table">
              <thead>
                <tr>
                  <th>Критерий</th>
                  <th>Описание</th>
                  <th>Максимум</th>
                  <th>Балл</th>
                  <th>Комментарий</th>
                </tr>
              </thead>
              <tbody>
                {criteria.map((criterion) => {
                  const item = items.find((entry) => entry.criterionId === criterion.id);

                  return (
                    <tr key={criterion.id}>
                      <td>
                        <strong>{criterion.title}</strong>
                        {criterion.isRequired && <small>обязательный</small>}
                      </td>
                      <td>{criterion.description ?? '-'}</td>
                      <td>{criterion.maxScore}</td>
                      <td>
                        <input
                          disabled={isLocked || isSubmitting}
                          max={criterion.maxScore}
                          min={0}
                          onChange={(event) =>
                            updateItem(
                              criterion.id,
                              'value',
                              event.target.value === ''
                                ? NaN
                                : Number(event.target.value),
                            )
                          }
                          type="number"
                          value={Number.isFinite(item?.value) ? item?.value : ''}
                        />
                        {fieldErrors[criterion.id] && (
                          <small className="v2-field-error">
                            {fieldErrors[criterion.id]}
                          </small>
                        )}
                      </td>
                      <td>
                        <textarea
                          disabled={isLocked || isSubmitting}
                          onChange={(event) =>
                            updateItem(criterion.id, 'comment', event.target.value)
                          }
                          value={item?.comment ?? ''}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <V2EmptyState title="Критерии не найдены" />
        )}
        {isLocked && <p className="v2-muted">Отправленную оценку нельзя изменить.</p>}
        {error && <p className="v2-form-alert">{error}</p>}
        {success && <p className="v2-form-success">{success}</p>}
        <div className="v2-submit-row">
          <V2Button
            disabled={isLocked}
            isLoading={isSubmitting}
            onClick={() => void saveDraft()}
            variant="secondary"
          >
            Сохранить как черновик
          </V2Button>
          <V2Button
            disabled={isLocked}
            isLoading={isSubmitting}
            onClick={() => setIsConfirmOpen(true)}
          >
            Отправить финальную оценку
          </V2Button>
        </div>
      </section>
      <V2ConfirmModal
        confirmLabel="Продолжить"
        isLoading={isSubmitting}
        isOpen={isConfirmOpen}
        message="После отправки оценку нельзя будет изменить. Продолжить?"
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={() => void submitScore()}
        title="Финальная отправка оценки"
      />
    </div>
  );
}
