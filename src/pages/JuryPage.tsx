import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Input,
  Spinner,
  Tabs,
  Toast,
} from '@heroui/react';
import { DashboardLayout } from '../components/DashboardLayout';
import { DashboardModal } from '../components/DashboardModal';
import { DataTable } from '../components/DataTable';
import { ProjectDetails } from '../components/ProjectDetails';
import { fetchJuryWorkspace, saveJuryScores } from '../lib/hackathonApi';
import type {
  AppUser,
  Criterion,
  EntityId,
  JuryWorkspace,
  Project,
  Score,
  Team,
} from '../lib/hackathonTypes';

type JuryPageProps = {
  currentUser: AppUser;
};

type ScoreDraft = {
  score: string;
  comment: string;
};

type ScoreMatrixDrafts = Record<string, Record<string, ScoreDraft>>;

function idKey(id: EntityId) {
  return String(id);
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function clampScore(value: number, maxScore: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(Math.max(value, 0), maxScore);
}

function createEmptyDraft() {
  return {
    comment: '',
    score: '',
  };
}

function buildProjectDrafts(criteria: Criterion[], scores: Score[]) {
  return Object.fromEntries(
    criteria.map((criterion) => {
      const existingScore = scores.find(
        (score) => idKey(score.criteria_id) === idKey(criterion.id),
      );

      return [
        idKey(criterion.id),
        {
          comment: existingScore?.comment ?? '',
          score:
            existingScore?.score === undefined ? '' : String(existingScore.score),
        },
      ];
    }),
  ) as Record<string, ScoreDraft>;
}

function buildMatrixDrafts(
  projects: Project[],
  criteria: Criterion[],
  scores: Score[],
) {
  return Object.fromEntries(
    projects.map((project) => {
      const projectScores = scores.filter(
        (score) => idKey(score.project_id) === idKey(project.id),
      );

      return [idKey(project.id), buildProjectDrafts(criteria, projectScores)];
    }),
  ) as ScoreMatrixDrafts;
}

function getProjectDrafts(
  matrix: ScoreMatrixDrafts,
  projectId: EntityId,
  criteria: Criterion[],
) {
  const projectDrafts = matrix[idKey(projectId)] ?? {};

  return Object.fromEntries(
    criteria.map((criterion) => [
      idKey(criterion.id),
      projectDrafts[idKey(criterion.id)] ?? createEmptyDraft(),
    ]),
  ) as Record<string, ScoreDraft>;
}

function getTeam(project: Project, teams: Team[]) {
  return teams.find((team) => idKey(team.id) === idKey(project.team_id)) ?? null;
}

export function JuryPage({ currentUser }: JuryPageProps) {
  const [workspace, setWorkspace] = useState<JuryWorkspace | null>(null);
  const [activeTab, setActiveTab] = useState('projects');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savingProjectId, setSavingProjectId] = useState<string | null>(null);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [scoreMatrixDrafts, setScoreMatrixDrafts] =
    useState<ScoreMatrixDrafts>({});

  const loadWorkspace = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextWorkspace = await fetchJuryWorkspace(currentUser.id);
      const projects = nextWorkspace.projects.filter(
        (project) => !project.is_archived,
      );

      setWorkspace(nextWorkspace);
      setScoreMatrixDrafts(
        buildMatrixDrafts(
          projects,
          nextWorkspace.criteria,
          nextWorkspace.scores,
        ),
      );
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Не удалось загрузить кабинет жюри.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkspace();
  }, []);

  const activeProjects = useMemo(
    () => workspace?.projects.filter((project) => !project.is_archived) ?? [],
    [workspace],
  );

  const teamsById = useMemo(() => {
    return new Map(
      workspace?.teams.map((team) => [idKey(team.id), team]) ?? [],
    );
  }, [workspace]);

  const criteriaById = useMemo(() => {
    return new Map(
      workspace?.criteria.map((criterion) => [idKey(criterion.id), criterion]) ??
        [],
    );
  }, [workspace]);

  const selectedProject =
    activeProjects.find((project) => idKey(project.id) === selectedProjectId) ??
    null;

  const myScoreRows = activeProjects
    .map((project) => {
      const scores =
        workspace?.scores.filter(
          (score) => idKey(score.project_id) === idKey(project.id),
        ) ?? [];
      const total = scores.reduce((sum, score) => {
        const criterion = criteriaById.get(idKey(score.criteria_id));
        return sum + Number(score.score) * Number(criterion?.weight ?? 1);
      }, 0);

      return {
        count: scores.length,
        project,
        total,
      };
    })
    .filter((row) => row.count > 0);

  const updateScoreDraft = (
    projectId: EntityId,
    criterionId: EntityId,
    field: keyof ScoreDraft,
    value: string,
  ) => {
    setScoreMatrixDrafts((current) => ({
      ...current,
      [idKey(projectId)]: {
        ...(current[idKey(projectId)] ?? {}),
        [idKey(criterionId)]: {
          comment:
            current[idKey(projectId)]?.[idKey(criterionId)]?.comment ?? '',
          score: current[idKey(projectId)]?.[idKey(criterionId)]?.score ?? '',
          [field]: value,
        },
      },
    }));
  };

  const buildScoreEntries = (project: Project) => {
    if (!workspace) {
      return [];
    }

    const projectDrafts = getProjectDrafts(
      scoreMatrixDrafts,
      project.id,
      workspace.criteria,
    );

    return workspace.criteria.map((criterion) => {
      const draft = projectDrafts[idKey(criterion.id)] ?? createEmptyDraft();

      return {
        comment: draft.comment.trim() || null,
        criteria_id: criterion.id,
        score: clampScore(Number(draft.score), criterion.max_score),
      };
    });
  };

  const updateSavedProjectScores = (
    project: Project,
    entries: ReturnType<typeof buildScoreEntries>,
  ) => {
    setWorkspace((current) => {
      if (!current) {
        return current;
      }

      const nextScores = entries.map((entry) => ({
        comment: entry.comment,
        created_at: null,
        criteria_id: entry.criteria_id,
        id: `${idKey(project.id)}:${idKey(entry.criteria_id)}`,
        jury_id: currentUser.id,
        project_id: project.id,
        score: entry.score,
      }));

      return {
        ...current,
        scores: [
          ...current.scores.filter(
            (score) => idKey(score.project_id) !== idKey(project.id),
          ),
          ...nextScores,
        ],
      };
    });
  };

  const getProjectTotal = (project: Project) => {
    if (!workspace) {
      return 0;
    }

    const projectDrafts = getProjectDrafts(
      scoreMatrixDrafts,
      project.id,
      workspace.criteria,
    );

    return workspace.criteria.reduce((sum, criterion) => {
      const draft = projectDrafts[idKey(criterion.id)] ?? createEmptyDraft();

      return (
        sum +
        clampScore(Number(draft.score), criterion.max_score) *
          Number(criterion.weight ?? 1)
      );
    }, 0);
  };

  const saveProjectScoreRow = async (project: Project, showToast = true) => {
    if (!workspace) {
      return;
    }

    if (workspace.criteria.length === 0) {
      Toast.toast.warning('Активные критерии ещё не созданы.');
      return;
    }

    const entries = buildScoreEntries(project);

    setSavingProjectId(idKey(project.id));

    try {
      await saveJuryScores(project.id, currentUser.id, entries);
      updateSavedProjectScores(project, entries);

      if (showToast) {
        Toast.toast.success('Оценки сохранены.');
      }
    } catch (saveError) {
      Toast.toast.danger(
        getErrorMessage(saveError, 'Не удалось сохранить оценки.'),
      );
      throw saveError;
    } finally {
      setSavingProjectId(null);
    }
  };

  const saveAllScores = async () => {
    if (!workspace || activeProjects.length === 0) {
      return;
    }

    setIsSavingAll(true);

    try {
      for (const project of activeProjects) {
        await saveProjectScoreRow(project, false);
      }

      Toast.toast.success('Все оценки сохранены.');
      setActiveTab('scores');
    } catch {
      // The row save already showed the exact error.
    } finally {
      setIsSavingAll(false);
    }
  };

  const renderProjects = () => (
    <DataTable
      ariaLabel="Проекты для жюри"
      columns={[
        {
          key: 'team',
          render: (project) =>
            teamsById.get(idKey(project.team_id))?.team_name ?? 'Без команды',
          title: 'Команда',
        },
        {
          isRowHeader: true,
          key: 'project',
          render: (project) => <strong>{project.title}</strong>,
          title: 'Проект',
        },
        {
          key: 'direction',
          render: (project) => project.direction ?? 'Не указано',
          title: 'Направление',
        },
        {
          key: 'short',
          render: (project) => project.short_description ?? 'Нет описания',
          title: 'Кратко',
        },
      ]}
      emptyText="Проекты пока не загружены."
      getRowId={(project) => idKey(project.id)}
      isLoading={isLoading}
      onRowClick={(project) => setSelectedProjectId(idKey(project.id))}
      rows={activeProjects}
    />
  );

  const renderEvaluation = () => {
    if (isLoading) {
      return (
        <Card className="dashboard-state">
          <Card.Content>
            <Spinner />
            <span>Загрузка проектов</span>
          </Card.Content>
        </Card>
      );
    }

    if (!workspace || activeProjects.length === 0) {
      return (
        <Card className="dashboard-state">
          <Card.Content>Проекты пока не загружены.</Card.Content>
        </Card>
      );
    }

    if (workspace.criteria.length === 0) {
      return (
        <Card className="dashboard-state">
          <Card.Content>Активные критерии ещё не созданы.</Card.Content>
        </Card>
      );
    }

    return (
      <div className="dashboard-stack">
        <div className="section-actions">
          <Button
            isDisabled={isSavingAll || Boolean(savingProjectId)}
            onPress={() => void saveAllScores()}
          >
            {isSavingAll ? 'Сохраняем...' : 'Сохранить все'}
          </Button>
        </div>

        <div className="jury-score-matrix">
          <table>
            <thead>
              <tr>
                <th>Команда и проект</th>
                {workspace.criteria.map((criterion) => (
                  <th key={idKey(criterion.id)}>
                    <span>{criterion.name}</span>
                    <small>0-{criterion.max_score}</small>
                  </th>
                ))}
                <th>Итог</th>
                <th>Действие</th>
              </tr>
            </thead>
            <tbody>
              {activeProjects.map((project) => {
                const team = getTeam(project, workspace.teams);
                const projectDrafts = getProjectDrafts(
                  scoreMatrixDrafts,
                  project.id,
                  workspace.criteria,
                );
                const isSavingRow =
                  savingProjectId === idKey(project.id) || isSavingAll;

                return (
                  <tr key={idKey(project.id)}>
                    <th scope="row">
                      <button
                        className="jury-project-link"
                        onClick={() => setSelectedProjectId(idKey(project.id))}
                        type="button"
                      >
                        <strong>{project.title}</strong>
                        <span>{team?.team_name ?? 'Без команды'}</span>
                      </button>
                    </th>
                    {workspace.criteria.map((criterion) => {
                      const draft =
                        projectDrafts[idKey(criterion.id)] ?? createEmptyDraft();

                      return (
                        <td key={idKey(criterion.id)}>
                          <Input
                            aria-label={`${project.title}: ${criterion.name}`}
                            disabled={isSavingRow}
                            max={criterion.max_score}
                            min={0}
                            onChange={(event) =>
                              updateScoreDraft(
                                project.id,
                                criterion.id,
                                'score',
                                event.target.value,
                              )
                            }
                            step="0.5"
                            type="number"
                            value={draft.score}
                          />
                        </td>
                      );
                    })}
                    <td className="jury-score-total">
                      {getProjectTotal(project).toFixed(1)}
                    </td>
                    <td>
                      <Button
                        isDisabled={isSavingRow}
                        onPress={() => void saveProjectScoreRow(project)}
                        size="sm"
                      >
                        {isSavingRow ? '...' : 'Сохранить'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderMyScores = () => (
    <DataTable
      ariaLabel="Мои оценки"
      columns={[
        {
          key: 'team',
          render: (row) =>
            teamsById.get(idKey(row.project.team_id))?.team_name ?? 'Без команды',
          title: 'Команда',
        },
        {
          isRowHeader: true,
          key: 'project',
          render: (row) => <strong>{row.project.title}</strong>,
          title: 'Проект',
        },
        {
          key: 'total',
          render: (row) => row.total.toFixed(1),
          title: 'Общий балл',
        },
        {
          key: 'avg',
          render: (row) => (row.total / row.count).toFixed(1),
          title: 'Средний',
        },
        {
          key: 'count',
          render: (row) => row.count,
          title: 'Критерии',
        },
        {
          key: 'action',
          render: () => (
            <Button
              onPress={() => {
                setActiveTab('evaluation');
              }}
              size="sm"
              variant="outline"
            >
              Изменить
            </Button>
          ),
          title: 'Действие',
        },
      ]}
      emptyText="Вы ещё не оценивали проекты."
      getRowId={(row) => idKey(row.project.id)}
      isLoading={isLoading}
      rows={myScoreRows}
    />
  );

  return (
    <DashboardLayout
      currentUser={currentUser}
      eyebrow="Кабинет жюри"
      subtitle="Просмотр проектов и выставление оценок по активным критериям"
      title="Оценивание"
    >
      {error && (
        <Alert role="alert" status="danger">
          <Alert.Content>
            <Alert.Title>{error}</Alert.Title>
          </Alert.Content>
        </Alert>
      )}

      <Tabs
        className="dashboard-tabs"
        onSelectionChange={(key) => setActiveTab(String(key))}
        selectedKey={activeTab}
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label="Разделы кабинета жюри">
            <Tabs.Tab id="projects">Проекты</Tabs.Tab>
            <Tabs.Tab id="evaluation">Оценивание</Tabs.Tab>
            <Tabs.Tab id="scores">Мои оценки</Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
        <Tabs.Panel id="projects">{renderProjects()}</Tabs.Panel>
        <Tabs.Panel id="evaluation">{renderEvaluation()}</Tabs.Panel>
        <Tabs.Panel id="scores">{renderMyScores()}</Tabs.Panel>
      </Tabs>

      {selectedProject && (
        <DashboardModal
          isOpen={Boolean(selectedProject)}
          onClose={() => setSelectedProjectId(null)}
          title="Проект"
        >
          <ProjectDetails
            project={selectedProject}
            team={teamsById.get(idKey(selectedProject.team_id))}
          />
        </DashboardModal>
      )}
    </DashboardLayout>
  );
}
