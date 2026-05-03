import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Alert,
  Button,
  Card,
  Chip,
  Input,
  Spinner,
  Tabs,
  TextArea,
  Toast,
} from '@heroui/react';
import { DashboardLayout } from '../components/DashboardLayout';
import { ProjectPreviewCard } from '../components/ProjectPreviewCard';
import { SelectField } from '../components/SelectField';
import {
  fetchParticipantWorkspace,
  saveProject,
  type ProjectPayload,
} from '../lib/hackathonApi';
import type {
  AppUser,
  ParticipantWorkspace,
  Project,
} from '../lib/hackathonTypes';

type ParticipantPageProps = {
  currentUser: AppUser;
};

type ProjectForm = {
  title: string;
  direction: string;
  short_description: string;
  full_description: string;
  problem: string;
  solution: string;
  target_audience: string;
  mvp_link: string;
  presentation_link: string;
  github_link: string;
  video_link: string;
};

const directionOptions = [
  'EdTech',
  'FinTech',
  'Eco',
  'Tourism',
  'SaaS',
  'Robotics',
  'Social Impact',
  'Other',
].map((direction) => ({ label: direction, value: direction }));

function createBlankProjectForm(): ProjectForm {
  return {
    direction: '',
    full_description: '',
    github_link: '',
    mvp_link: '',
    presentation_link: '',
    problem: '',
    short_description: '',
    solution: '',
    target_audience: '',
    title: '',
    video_link: '',
  };
}

function formFromProject(project: Project | null): ProjectForm {
  if (!project) {
    return createBlankProjectForm();
  }

  return {
    direction: project.direction ?? '',
    full_description: project.full_description ?? '',
    github_link: project.github_link ?? '',
    mvp_link: project.mvp_link ?? '',
    presentation_link: project.presentation_link ?? '',
    problem: project.problem ?? '',
    short_description: project.short_description ?? '',
    solution: project.solution ?? '',
    target_audience: project.target_audience ?? '',
    title: project.title,
    video_link: project.video_link ?? '',
  };
}

function emptyToNull(value: string) {
  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : null;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function ParticipantPage({ currentUser }: ParticipantPageProps) {
  const [workspace, setWorkspace] = useState<ParticipantWorkspace | null>(null);
  const [projectForm, setProjectForm] = useState<ProjectForm>(
    createBlankProjectForm,
  );
  const [activeTab, setActiveTab] = useState('team');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadWorkspace = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextWorkspace = await fetchParticipantWorkspace(currentUser.id);
      setWorkspace(nextWorkspace);
      setProjectForm(formFromProject(nextWorkspace.project));
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Не удалось загрузить кабинет.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkspace();
  }, []);

  const previewProject = useMemo<Project | null>(() => {
    if (!workspace?.team) {
      return null;
    }

    if (!workspace.project && !projectForm.title.trim()) {
      return null;
    }

    return {
      created_at: workspace.project?.created_at ?? null,
      direction: projectForm.direction,
      full_description: projectForm.full_description,
      github_link: emptyToNull(projectForm.github_link),
      id: workspace.project?.id ?? 'preview',
      is_archived: workspace.project?.is_archived ?? false,
      mvp_link: emptyToNull(projectForm.mvp_link),
      presentation_link: emptyToNull(projectForm.presentation_link),
      problem: projectForm.problem,
      short_description: projectForm.short_description,
      solution: projectForm.solution,
      target_audience: projectForm.target_audience,
      team_id: workspace.team.id,
      title: projectForm.title || 'Название проекта',
      updated_at: workspace.project?.updated_at ?? null,
      video_link: emptyToNull(projectForm.video_link),
    };
  }, [projectForm, workspace]);

  const updateProjectField = (field: keyof ProjectForm, value: string) => {
    setProjectForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSaveProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!workspace?.team) {
      Toast.toast.warning('Команда не привязана к аккаунту.');
      return;
    }

    if (
      !projectForm.title.trim() ||
      !projectForm.direction ||
      !projectForm.short_description.trim()
    ) {
      Toast.toast.warning('Заполните название, направление и краткое описание.');
      return;
    }

    const payload: ProjectPayload = {
      direction: projectForm.direction,
      full_description: projectForm.full_description.trim(),
      github_link: emptyToNull(projectForm.github_link),
      mvp_link: emptyToNull(projectForm.mvp_link),
      presentation_link: emptyToNull(projectForm.presentation_link),
      problem: projectForm.problem.trim(),
      short_description: projectForm.short_description.trim(),
      solution: projectForm.solution.trim(),
      target_audience: projectForm.target_audience.trim(),
      title: projectForm.title.trim(),
      video_link: emptyToNull(projectForm.video_link),
    };

    setIsSaving(true);

    try {
      const savedProject = await saveProject(
        workspace.team.id,
        payload,
        workspace.project?.id,
      );
      setWorkspace((current) =>
        current
          ? {
              ...current,
              project: savedProject,
            }
          : current,
      );
      Toast.toast.success('Проект сохранён.');
      setActiveTab('preview');
    } catch (saveError) {
      Toast.toast.danger(
        getErrorMessage(saveError, 'Не удалось сохранить проект.'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const renderTeam = () => {
    if (isLoading) {
      return (
        <Card className="dashboard-state">
          <Card.Content>
            <Spinner />
            <span>Загрузка команды</span>
          </Card.Content>
        </Card>
      );
    }

    if (!workspace?.team) {
      return (
        <Card className="dashboard-state">
          <Card.Content>
            Команда ещё не привязана к этому аккаунту. Обратитесь к
            администратору.
          </Card.Content>
        </Card>
      );
    }

    return (
      <div className="participant-team-grid">
        <Card>
          <Card.Header>
            <Card.Title>{workspace.team.team_name}</Card.Title>
            <Card.Description>
              {workspace.team.group_name ?? 'Группа не указана'}
            </Card.Description>
          </Card.Header>
          <Card.Content className="detail-grid">
            {workspace.team.external_place && (
              <div>
                <span>Откуда</span>
                <strong>{workspace.team.external_place}</strong>
              </div>
            )}
            <div>
              <span>Лидер</span>
              <strong>{currentUser.full_name}</strong>
            </div>
            <div>
              <span>Telegram</span>
              <strong>{currentUser.telegram ?? 'Не указан'}</strong>
            </div>
            <div>
              <span>Телефон</span>
              <strong>{currentUser.phone ?? 'Не указан'}</strong>
            </div>
          </Card.Content>
        </Card>
        <Card>
          <Card.Header>
            <Card.Title>Участники</Card.Title>
            <Card.Description>
              {workspace.members.length} человек в команде
            </Card.Description>
          </Card.Header>
          <Card.Content className="members-list">
            {workspace.members.map((member) => (
              <span key={String(member.id)}>{member.full_name}</span>
            ))}
          </Card.Content>
        </Card>
      </div>
    );
  };

  const renderProjectForm = () => (
    <Card>
      <Card.Header>
        <Card.Title>Карточка проекта</Card.Title>
        <Card.Description>
          Эти данные увидят администратор и члены жюри.
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <form className="dashboard-form" onSubmit={handleSaveProject}>
          <div className="form-grid-2">
            <label className="dashboard-field">
              <span>Название</span>
              <Input
                disabled={isSaving}
                onChange={(event) =>
                  updateProjectField('title', event.target.value)
                }
                value={projectForm.title}
              />
            </label>
            <SelectField
              isDisabled={isSaving}
              label="Направление"
              onChange={(value) => updateProjectField('direction', value)}
              options={directionOptions}
              placeholder="Выберите направление"
              value={projectForm.direction}
            />
          </div>
          <label className="dashboard-field">
            <span>Краткое описание</span>
            <TextArea
              disabled={isSaving}
              onChange={(event) =>
                updateProjectField('short_description', event.target.value)
              }
              value={projectForm.short_description}
            />
          </label>
          <label className="dashboard-field">
            <span>Полное описание</span>
            <TextArea
              disabled={isSaving}
              onChange={(event) =>
                updateProjectField('full_description', event.target.value)
              }
              value={projectForm.full_description}
            />
          </label>
          <div className="form-grid-3">
            <label className="dashboard-field">
              <span>Проблема</span>
              <TextArea
                disabled={isSaving}
                onChange={(event) =>
                  updateProjectField('problem', event.target.value)
                }
                value={projectForm.problem}
              />
            </label>
            <label className="dashboard-field">
              <span>Решение</span>
              <TextArea
                disabled={isSaving}
                onChange={(event) =>
                  updateProjectField('solution', event.target.value)
                }
                value={projectForm.solution}
              />
            </label>
            <label className="dashboard-field">
              <span>Целевая аудитория</span>
              <TextArea
                disabled={isSaving}
                onChange={(event) =>
                  updateProjectField('target_audience', event.target.value)
                }
                value={projectForm.target_audience}
              />
            </label>
          </div>
          <div className="form-grid-2">
            <label className="dashboard-field">
              <span>MVP</span>
              <Input
                disabled={isSaving}
                onChange={(event) =>
                  updateProjectField('mvp_link', event.target.value)
                }
                placeholder="https://"
                value={projectForm.mvp_link}
              />
            </label>
            <label className="dashboard-field">
              <span>Презентация</span>
              <Input
                disabled={isSaving}
                onChange={(event) =>
                  updateProjectField('presentation_link', event.target.value)
                }
                placeholder="https://"
                value={projectForm.presentation_link}
              />
            </label>
            <label className="dashboard-field">
              <span>GitHub</span>
              <Input
                disabled={isSaving}
                onChange={(event) =>
                  updateProjectField('github_link', event.target.value)
                }
                placeholder="https://"
                value={projectForm.github_link}
              />
            </label>
            <label className="dashboard-field">
              <span>Видео</span>
              <Input
                disabled={isSaving}
                onChange={(event) =>
                  updateProjectField('video_link', event.target.value)
                }
                placeholder="https://"
                value={projectForm.video_link}
              />
            </label>
          </div>
          <Button isDisabled={isSaving} type="submit">
            {isSaving ? 'Сохраняем...' : 'Сохранить проект'}
          </Button>
        </form>
      </Card.Content>
    </Card>
  );

  return (
    <DashboardLayout
      currentUser={currentUser}
      eyebrow="Кабинет лидера"
      subtitle="Команда, участники и проектная карточка для оценки"
      title="Личный кабинет"
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
          <Tabs.List aria-label="Разделы кабинета участника">
            <Tabs.Tab id="team">Моя команда</Tabs.Tab>
            <Tabs.Tab id="project">Мой проект</Tabs.Tab>
            <Tabs.Tab id="preview">Предпросмотр</Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
        <Tabs.Panel id="team">{renderTeam()}</Tabs.Panel>
        <Tabs.Panel id="project">
          {workspace?.team ? (
            renderProjectForm()
          ) : (
            <Card className="dashboard-state">
              <Card.Content>Сначала администратор должен привязать команду.</Card.Content>
            </Card>
          )}
        </Tabs.Panel>
        <Tabs.Panel id="preview">
          <div className="preview-toolbar">
            {workspace?.project ? (
              <Chip color="success" variant="soft">
                Проект сохранён
              </Chip>
            ) : (
              <Chip color="warning" variant="soft">
                Черновик
              </Chip>
            )}
          </div>
          <ProjectPreviewCard project={previewProject} team={workspace?.team ?? null} />
        </Tabs.Panel>
      </Tabs>
    </DashboardLayout>
  );
}
