import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Alert,
  Button,
  Card,
  Input,
  Spinner,
  Tabs,
  TextArea,
  Toast,
} from '@heroui/react';
import { DashboardLayout } from '../components/DashboardLayout';
import { DashboardModal } from '../components/DashboardModal';
import { DataTable } from '../components/DataTable';
import { ProjectDetails } from '../components/ProjectDetails';
import { SelectField } from '../components/SelectField';
import {
  fetchJuryScoresForProject,
  fetchJuryWorkspace,
  saveJuryScores,
} from '../lib/hackathonApi';
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

function buildDrafts(criteria: Criterion[], scores: Score[]) {
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

function getTeam(project: Project, teams: Team[]) {
  return teams.find((team) => idKey(team.id) === idKey(project.team_id)) ?? null;
}

export function JuryPage({ currentUser }: JuryPageProps) {
  const [workspace, setWorkspace] = useState<JuryWorkspace | null>(null);
  const [activeTab, setActiveTab] = useState('projects');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingScores, setIsLoadingScores] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [scoringProjectId, setScoringProjectId] = useState('');
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, ScoreDraft>>({});

  const loadWorkspace = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextWorkspace = await fetchJuryWorkspace(currentUser.id);
      setWorkspace(nextWorkspace);
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
  const scoringProject =
    activeProjects.find((project) => idKey(project.id) === scoringProjectId) ??
    null;

  const projectOptions = activeProjects.map((project) => {
    const team = teamsById.get(idKey(project.team_id));
    return {
      label: `${team?.team_name ?? 'Без команды'} — ${project.title}`,
      value: idKey(project.id),
    };
  });

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

  const selectProjectForScoring = async (projectId: string) => {
    setScoringProjectId(projectId);

    if (!workspace || !projectId) {
      setScoreDrafts({});
      return;
    }

    setIsLoadingScores(true);

    try {
      const projectScores = await fetchJuryScoresForProject(
        currentUser.id,
        projectId,
      );
      setScoreDrafts(buildDrafts(workspace.criteria, projectScores));
      setWorkspace((current) => {
        if (!current) {
          return current;
        }

        const otherScores = current.scores.filter(
          (score) => idKey(score.project_id) !== projectId,
        );

        return {
          ...current,
          scores: [...otherScores, ...projectScores],
        };
      });
    } catch (loadError) {
      Toast.toast.danger(
        getErrorMessage(loadError, 'Не удалось загрузить оценки проекта.'),
      );
    } finally {
      setIsLoadingScores(false);
    }
  };

  const updateScoreDraft = (
    criterionId: EntityId,
    field: keyof ScoreDraft,
    value: string,
  ) => {
    setScoreDrafts((current) => ({
      ...current,
      [idKey(criterionId)]: {
        comment: current[idKey(criterionId)]?.comment ?? '',
        score: current[idKey(criterionId)]?.score ?? '',
        [field]: value,
      },
    }));
  };

  const handleSaveScores = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!workspace || !scoringProject) {
      Toast.toast.warning('Выберите проект для оценки.');
      return;
    }

    if (workspace.criteria.length === 0) {
      Toast.toast.warning('Активные критерии ещё не созданы.');
      return;
    }

    const entries = workspace.criteria.map((criterion) => {
      const draft = scoreDrafts[idKey(criterion.id)] ?? {
        comment: '',
        score: '',
      };

      return {
        comment: draft.comment.trim() || null,
        criteria_id: criterion.id,
        score: clampScore(Number(draft.score), criterion.max_score),
      };
    });

    setIsSaving(true);

    try {
      await saveJuryScores(scoringProject.id, currentUser.id, entries);
      const projectScores = await fetchJuryScoresForProject(
        currentUser.id,
        scoringProject.id,
      );
      setWorkspace((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          scores: [
            ...current.scores.filter(
              (score) => idKey(score.project_id) !== idKey(scoringProject.id),
            ),
            ...projectScores,
          ],
        };
      });
      setScoreDrafts(buildDrafts(workspace.criteria, projectScores));
      Toast.toast.success('Оценки сохранены.');
      setActiveTab('scores');
    } catch (saveError) {
      Toast.toast.danger(
        getErrorMessage(saveError, 'Не удалось сохранить оценки.'),
      );
    } finally {
      setIsSaving(false);
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

    return (
      <div className="dashboard-stack">
        <SelectField
          label="Проект"
          onChange={(value) => void selectProjectForScoring(value)}
          options={projectOptions}
          placeholder="Выберите проект"
          value={scoringProjectId}
        />

        {!scoringProject ? (
          <Card className="dashboard-state">
            <Card.Content>Выберите проект, чтобы открыть форму оценки.</Card.Content>
          </Card>
        ) : (
          <form className="dashboard-stack" onSubmit={handleSaveScores}>
            <Card>
              <Card.Header>
                <Card.Title>{scoringProject.title}</Card.Title>
                <Card.Description>
                  {getTeam(scoringProject, workspace?.teams ?? [])?.team_name ??
                    'Без команды'}
                </Card.Description>
              </Card.Header>
              <Card.Content>
                <p className="muted-text">
                  {scoringProject.short_description ?? 'Описание не заполнено'}
                </p>
              </Card.Content>
            </Card>

            {isLoadingScores ? (
              <Card className="dashboard-state">
                <Card.Content>
                  <Spinner />
                  <span>Загрузка сохранённых оценок</span>
                </Card.Content>
              </Card>
            ) : (
              workspace?.criteria.map((criterion) => {
                const draft = scoreDrafts[idKey(criterion.id)] ?? {
                  comment: '',
                  score: '',
                };

                return (
                  <Card className="score-card" key={idKey(criterion.id)}>
                    <Card.Header>
                      <Card.Title>{criterion.name}</Card.Title>
                      <Card.Description>
                        {criterion.description ?? 'Описание критерия не указано'}
                      </Card.Description>
                    </Card.Header>
                    <Card.Content>
                      <div className="form-grid-2">
                        <label className="dashboard-field">
                          <span>Балл от 0 до {criterion.max_score}</span>
                          <Input
                            disabled={isSaving}
                            max={criterion.max_score}
                            min={0}
                            onChange={(event) =>
                              updateScoreDraft(
                                criterion.id,
                                'score',
                                event.target.value,
                              )
                            }
                            type="number"
                            value={draft.score}
                          />
                        </label>
                        <label className="dashboard-field">
                          <span>Комментарий</span>
                          <TextArea
                            disabled={isSaving}
                            onChange={(event) =>
                              updateScoreDraft(
                                criterion.id,
                                'comment',
                                event.target.value,
                              )
                            }
                            value={draft.comment}
                          />
                        </label>
                      </div>
                    </Card.Content>
                  </Card>
                );
              })
            )}

            <Button isDisabled={isSaving || isLoadingScores} type="submit">
              {isSaving ? 'Сохраняем...' : 'Сохранить оценки'}
            </Button>
          </form>
        )}
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
          render: (row) => (
            <Button
              onPress={() => {
                void selectProjectForScoring(idKey(row.project.id));
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
