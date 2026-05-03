import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Alert,
  Button,
  Card,
  Chip,
  Input,
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
  createCriterion,
  createLeaderForTeam,
  createUser,
  deleteCriterion,
  deleteUser,
  fetchAdminData,
  saveWinner,
  setCriterionActive,
  updateCriterion,
  updateUser,
} from '../lib/hackathonApi';
import type {
  AdminData,
  AppUser,
  Criterion,
  EntityId,
  Project,
  Team,
} from '../lib/hackathonTypes';

type AdminPageProps = {
  currentUser: AppUser;
};

type UserModalState =
  | { mode: 'jury-create' }
  | { mode: 'jury-edit'; user: AppUser }
  | { mode: 'leader-create'; team: Team }
  | { mode: 'leader-edit'; team: Team; user: AppUser }
  | null;

type UserForm = {
  full_name: string;
  login: string;
  password: string;
  phone: string;
  telegram: string;
};

type CriteriaModalState =
  | { mode: 'create' }
  | { mode: 'edit'; criterion: Criterion }
  | null;

type CriteriaForm = {
  name: string;
  description: string;
  max_score: string;
  weight: string;
  is_active: boolean;
};

type ChartDatum = {
  label: string;
  value: number;
};

const directions = [
  'EdTech',
  'FinTech',
  'Eco',
  'Tourism',
  'SaaS',
  'Robotics',
  'Social Impact',
  'Other',
];

const directionOptions = [
  { label: 'Все направления', value: 'all' },
  ...directions.map((direction) => ({ label: direction, value: direction })),
];

function idKey(id: EntityId) {
  return String(id);
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Нет даты';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function emptyToNull(value: string) {
  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : null;
}

function createBlankUserForm(): UserForm {
  return {
    full_name: '',
    login: '',
    password: '',
    phone: '',
    telegram: '',
  };
}

function createBlankCriteriaForm(): CriteriaForm {
  return {
    description: '',
    is_active: true,
    max_score: '10',
    name: '',
    weight: '1',
  };
}

function secureRandomInt(max: number) {
  const buffer = new Uint32Array(1);

  globalThis.crypto.getRandomValues(buffer);

  return buffer[0] % max;
}

function randomDigits(length: number) {
  return Array.from({ length }, () => secureRandomInt(10)).join('');
}

function generatePassword(length = 8) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

  return Array.from(
    { length },
    () => alphabet[secureRandomInt(alphabet.length)],
  ).join('');
}

function normalizeLoginBase(value: string, fallback: string) {
  const normalizedValue = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 14);

  return normalizedValue || fallback;
}

function generateLogin(value: string, fallback: string) {
  return `${normalizeLoginBase(value, fallback)}${randomDigits(4)}`;
}

function countBy(items: string[]) {
  const map = new Map<string, number>();

  items.forEach((item) => {
    map.set(item, (map.get(item) ?? 0) + 1);
  });

  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value);
}

export function AdminPage({ currentUser }: AdminPageProps) {
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [projectSearch, setProjectSearch] = useState('');
  const [projectDirection, setProjectDirection] = useState('all');
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveDirection, setArchiveDirection] = useState('all');
  const [userModal, setUserModal] = useState<UserModalState>(null);
  const [userForm, setUserForm] = useState<UserForm>(createBlankUserForm);
  const [criteriaModal, setCriteriaModal] = useState<CriteriaModalState>(null);
  const [criteriaForm, setCriteriaForm] = useState<CriteriaForm>(
    createBlankCriteriaForm,
  );
  const [winnerSelections, setWinnerSelections] = useState<
    Record<string, string>
  >({});
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextData = await fetchAdminData();
      setData(nextData);
      setWinnerSelections(
        Object.fromEntries(
          nextData.winners.map((winner) => [
            idKey(winner.nomination_id),
            idKey(winner.project_id),
          ]),
        ),
      );
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Не удалось загрузить админку.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const usersById = useMemo(() => {
    return new Map(data?.users.map((user) => [idKey(user.id), user]) ?? []);
  }, [data]);

  const teamsById = useMemo(() => {
    return new Map(data?.teams.map((team) => [idKey(team.id), team]) ?? []);
  }, [data]);

  const projectsById = useMemo(() => {
    return new Map(
      data?.projects.map((project) => [idKey(project.id), project]) ?? [],
    );
  }, [data]);

  const activeProjects = useMemo(
    () => data?.projects.filter((project) => !project.is_archived) ?? [],
    [data],
  );

  const directionChartData = useMemo(
    () =>
      countBy(
        activeProjects.map((project) => project.direction || 'Без направления'),
      ),
    [activeProjects],
  );

  const groupChartData = useMemo(
    () =>
      countBy(
        (data?.teams ?? []).map((team) => team.group_name || 'Без группы'),
      ).slice(0, 8),
    [data],
  );

  const topResultChartData = useMemo(
    () =>
      (data?.results ?? []).slice(0, 6).map((result) => ({
        label: `${result.team_name}: ${result.project_title}`,
        value: Number(result.total_score ?? 0),
      })),
    [data],
  );

  const filteredProjects = useMemo(() => {
    const search = projectSearch.trim().toLowerCase();

    return activeProjects.filter((project) => {
      const team = teamsById.get(idKey(project.team_id));
      const matchesSearch =
        !search ||
        project.title.toLowerCase().includes(search) ||
        (team?.team_name.toLowerCase().includes(search) ?? false);
      const matchesDirection =
        projectDirection === 'all' || project.direction === projectDirection;

      return matchesSearch && matchesDirection;
    });
  }, [activeProjects, projectDirection, projectSearch, teamsById]);

  const archivedProjects = useMemo(() => {
    const search = archiveSearch.trim().toLowerCase();

    return (
      data?.projects.filter((project) => {
        const team = teamsById.get(idKey(project.team_id));
        const matchesArchived = Boolean(project.is_archived);
        const matchesSearch =
          !search ||
          project.title.toLowerCase().includes(search) ||
          (team?.team_name.toLowerCase().includes(search) ?? false);
        const matchesDirection =
          archiveDirection === 'all' || project.direction === archiveDirection;

        return matchesArchived && matchesSearch && matchesDirection;
      }) ?? []
    );
  }, [archiveDirection, archiveSearch, data, teamsById]);

  const selectedTeam =
    data?.teams.find((team) => idKey(team.id) === selectedTeamId) ?? null;
  const selectedProject =
    data?.projects.find((project) => idKey(project.id) === selectedProjectId) ??
    null;
  const selectedResult =
    data?.results.find(
      (result) => idKey(result.project_id) === selectedResultId,
    ) ?? null;
  const resultProject = selectedResult
    ? projectsById.get(idKey(selectedResult.project_id)) ?? null
    : null;

  const openJuryCreate = () => {
    setUserForm({
      ...createBlankUserForm(),
      login: generateLogin('jury', 'jury'),
      password: generatePassword(),
    });
    setUserModal({ mode: 'jury-create' });
  };

  const openJuryEdit = (user: AppUser) => {
    setUserForm({
      full_name: user.full_name,
      login: user.login,
      password: '',
      phone: user.phone ?? '',
      telegram: user.telegram ?? '',
    });
    setUserModal({ mode: 'jury-edit', user });
  };

  const openLeaderCreate = (team: Team) => {
    setUserForm({
      ...createBlankUserForm(),
      login: generateLogin(team.team_name, 'leader'),
      password: generatePassword(),
    });
    setUserModal({ mode: 'leader-create', team });
  };

  const openLeaderAccess = (team: Team) => {
    const leader = team.leader_id
      ? usersById.get(idKey(team.leader_id))
      : undefined;

    if (!leader) {
      openLeaderCreate(team);
      return;
    }

    setUserForm({
      full_name: leader.full_name,
      login: leader.login,
      password: generatePassword(),
      phone: leader.phone ?? '',
      telegram: leader.telegram ?? '',
    });
    setUserModal({ mode: 'leader-edit', team, user: leader });
  };

  const openCriteriaCreate = () => {
    setCriteriaForm(createBlankCriteriaForm());
    setCriteriaModal({ mode: 'create' });
  };

  const openCriteriaEdit = (criterion: Criterion) => {
    setCriteriaForm({
      description: criterion.description ?? '',
      is_active: criterion.is_active,
      max_score: String(criterion.max_score),
      name: criterion.name,
      weight: String(criterion.weight),
    });
    setCriteriaModal({ mode: 'edit', criterion });
  };

  const buildCredentialsText = () => {
    const roleLabel =
      userModal?.mode === 'leader-create' || userModal?.mode === 'leader-edit'
        ? 'Лидер команды'
        : userModal?.mode === 'jury-edit'
          ? 'Жюри'
          : 'Жюри';
    const teamLine =
      userModal?.mode === 'leader-create' || userModal?.mode === 'leader-edit'
        ? [`Команда: ${userModal.team.team_name}`]
        : [];

    return [
      'BashtUp III — доступ к кабинету',
      `Роль: ${roleLabel}`,
      ...teamLine,
      `Ссылка: ${window.location.origin}/login`,
      `Логин: ${userForm.login.trim()}`,
      `Пароль: ${userForm.password.trim()}`,
    ].join('\n');
  };

  const copyCredentialsToClipboard = async (showToast = true) => {
    if (!userForm.login.trim() || !userForm.password.trim()) {
      if (showToast) {
        Toast.toast.warning('Сначала заполните логин и пароль.');
      }

      return false;
    }

    const text = buildCredentialsText();

    try {
      await navigator.clipboard.writeText(text);

      if (showToast) {
        Toast.toast.success('Логин и пароль скопированы.');
      }

      return true;
    } catch {
      const textarea = document.createElement('textarea');

      textarea.value = text;
      textarea.setAttribute('readonly', 'true');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.append(textarea);
      textarea.select();

      const isCopied = document.execCommand('copy');

      textarea.remove();

      if (showToast) {
        Toast.toast[isCopied ? 'success' : 'danger'](
          isCopied
            ? 'Логин и пароль скопированы.'
            : 'Браузер не дал скопировать доступ.',
        );
      }

      return isCopied;
    }
  };

  const generateUserCredentials = () => {
    setUserForm((current) => {
      const source =
        userModal?.mode === 'leader-create' || userModal?.mode === 'leader-edit'
          ? userModal.team.team_name
          : current.full_name || 'jury';
      const fallback =
        userModal?.mode === 'leader-create' || userModal?.mode === 'leader-edit'
          ? 'leader'
          : 'jury';

      return {
        ...current,
        login: generateLogin(source, fallback),
        password: generatePassword(),
      };
    });
  };

  const submitUserForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!userModal) {
      return;
    }

    if (!userForm.full_name.trim() || !userForm.login.trim()) {
      Toast.toast.warning('Заполните ФИО и логин.');
      return;
    }

    if (userModal.mode !== 'jury-edit' && !userForm.password.trim()) {
      Toast.toast.warning('Укажите пароль.');
      return;
    }

    setIsSaving(true);

    try {
      if (userModal.mode === 'jury-edit') {
        await updateUser(userModal.user.id, {
          full_name: userForm.full_name.trim(),
          login: userForm.login.trim(),
          password: userForm.password.trim() || undefined,
          phone: emptyToNull(userForm.phone),
          telegram: emptyToNull(userForm.telegram),
        });
      }

      if (userModal.mode === 'jury-create') {
        await createUser({
          full_name: userForm.full_name.trim(),
          login: userForm.login.trim(),
          password: userForm.password.trim(),
          role: 'jury',
        });
      }

      if (userModal.mode === 'leader-create') {
        await createLeaderForTeam(userModal.team.id, {
          full_name: userForm.full_name.trim(),
          login: userForm.login.trim(),
          password: userForm.password.trim(),
          phone: emptyToNull(userForm.phone),
          telegram: emptyToNull(userForm.telegram),
        });
      }

      if (userModal.mode === 'leader-edit') {
        await updateUser(userModal.user.id, {
          full_name: userForm.full_name.trim(),
          login: userForm.login.trim(),
          password: userForm.password.trim(),
          phone: emptyToNull(userForm.phone),
          telegram: emptyToNull(userForm.telegram),
        });
      }

      const shouldCopyCredentials = userModal.mode !== 'jury-edit';
      const copiedCredentials = shouldCopyCredentials
        ? await copyCredentialsToClipboard(false)
        : false;

      Toast.toast.success(
        shouldCopyCredentials && copiedCredentials
          ? 'Данные сохранены, доступ скопирован.'
          : 'Данные сохранены.',
      );
      setUserModal(null);
      await loadData();
    } catch (saveError) {
      Toast.toast.danger(
        getErrorMessage(saveError, 'Не удалось сохранить пользователя.'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const submitCriteriaForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!criteriaModal) {
      return;
    }

    if (!criteriaForm.name.trim()) {
      Toast.toast.warning('Введите название критерия.');
      return;
    }

    const payload = {
      description: emptyToNull(criteriaForm.description),
      is_active: criteriaForm.is_active,
      max_score: Number(criteriaForm.max_score),
      name: criteriaForm.name.trim(),
      weight: Number(criteriaForm.weight),
    };

    setIsSaving(true);

    try {
      if (criteriaModal.mode === 'edit') {
        await updateCriterion(criteriaModal.criterion.id, payload);
      } else {
        await createCriterion(payload);
      }

      Toast.toast.success('Критерий сохранён.');
      setCriteriaModal(null);
      await loadData();
    } catch (saveError) {
      Toast.toast.danger(
        getErrorMessage(saveError, 'Не удалось сохранить критерий.'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteJury = async (user: AppUser) => {
    if (!window.confirm(`Удалить жюри ${user.full_name}?`)) {
      return;
    }

    try {
      await deleteUser(user.id);
      Toast.toast.success('Жюри удалён.');
      await loadData();
    } catch (deleteError) {
      Toast.toast.danger(
        getErrorMessage(deleteError, 'Не удалось удалить жюри.'),
      );
    }
  };

  const handleDeleteCriterion = async (criterion: Criterion) => {
    if (!window.confirm(`Удалить критерий "${criterion.name}"?`)) {
      return;
    }

    try {
      await deleteCriterion(criterion.id);
      Toast.toast.success('Критерий удалён.');
      await loadData();
    } catch (deleteError) {
      Toast.toast.danger(
        getErrorMessage(deleteError, 'Не удалось удалить критерий.'),
      );
    }
  };

  const handleToggleCriterion = async (criterion: Criterion) => {
    try {
      await setCriterionActive(criterion.id, !criterion.is_active);
      Toast.toast.success('Статус критерия обновлён.');
      await loadData();
    } catch (toggleError) {
      Toast.toast.danger(
        getErrorMessage(toggleError, 'Не удалось изменить критерий.'),
      );
    }
  };

  const handleSaveWinner = async (nominationId: EntityId) => {
    const projectId = winnerSelections[idKey(nominationId)];

    if (!projectId) {
      Toast.toast.warning('Выберите проект-победитель.');
      return;
    }

    try {
      await saveWinner(nominationId, projectId);
      Toast.toast.success('Победитель сохранён.');
      await loadData();
    } catch (saveError) {
      Toast.toast.danger(
        getErrorMessage(saveError, 'Не удалось сохранить победителя.'),
      );
    }
  };

  const getTeamMembers = (teamId: EntityId) =>
    data?.members.filter((member) => idKey(member.team_id) === idKey(teamId)) ??
    [];

  const renderProjectLinks = (project: Project) => {
    const links = [
      project.mvp_link,
      project.presentation_link,
      project.github_link,
      project.video_link,
    ].filter(Boolean);

    return links.length > 0 ? (
      <Chip color="success" variant="soft">
        {links.length} ссыл.
      </Chip>
    ) : (
      <Chip variant="soft">Нет</Chip>
    );
  };

  const renderScoreSummary = (projectId: EntityId) => {
    const scores =
      data?.scores.filter((score) => idKey(score.project_id) === idKey(projectId)) ??
      [];

    if (!data || scores.length === 0) {
      return <p className="muted-text">Оценок по проекту пока нет.</p>;
    }

    return (
      <div className="score-summary">
        {data.criteria.map((criterion) => {
          const criterionScores = scores.filter(
            (score) => idKey(score.criteria_id) === idKey(criterion.id),
          );
          const total = criterionScores.reduce(
            (sum, score) => sum + Number(score.score),
            0,
          );
          const average = criterionScores.length
            ? total / criterionScores.length
            : 0;

          return (
            <div className="score-summary-row" key={idKey(criterion.id)}>
              <div>
                <strong>{criterion.name}</strong>
                <span>
                  {criterionScores.length} оценок, максимум {criterion.max_score}
                </span>
              </div>
              <b>{average.toFixed(1)}</b>
            </div>
          );
        })}
      </div>
    );
  };

  const renderBarChart = (
    title: string,
    description: string,
    rows: ChartDatum[],
    suffix = '',
  ) => {
    const maxValue = Math.max(...rows.map((row) => row.value), 1);

    return (
      <Card className="chart-card">
        <Card.Header>
          <Card.Title>{title}</Card.Title>
          <Card.Description>{description}</Card.Description>
        </Card.Header>
        <Card.Content>
          {rows.length === 0 ? (
            <p className="muted-text">Данных пока нет.</p>
          ) : (
            <div className="bar-chart">
              {rows.map((row) => (
                <div className="bar-chart-row" key={row.label}>
                  <div className="bar-chart-label">
                    <span>{row.label}</span>
                    <strong>
                      {row.value.toFixed(Number.isInteger(row.value) ? 0 : 1)}
                      {suffix}
                    </strong>
                  </div>
                  <div className="bar-track" aria-hidden="true">
                    <div
                      className="bar-fill"
                      style={{ width: `${(row.value / maxValue) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card.Content>
      </Card>
    );
  };

  const renderOverview = () => {
    const analytics = data?.analytics;
    const cards = [
      ['Команды', analytics?.total_teams ?? 0],
      ['Участники', analytics?.total_members ?? 0],
      ['Проекты', analytics?.total_projects ?? 0],
      ['Голосовали жюри', analytics?.total_jury_voted ?? 0],
    ];

    return (
      <div className="dashboard-stack">
        <div className="metric-grid">
          {cards.map(([label, value]) => (
            <Card className="metric-card" key={label}>
              <Card.Content>
                <span>{label}</span>
                <strong>{value}</strong>
              </Card.Content>
            </Card>
          ))}
        </div>
        <div className="chart-grid">
          {renderBarChart(
            'Проекты по направлениям',
            'Сколько активных проектов в каждом треке',
            directionChartData,
          )}
          {renderBarChart(
            'Команды по группам',
            'Самые активные группы по регистрациям',
            groupChartData,
          )}
          {renderBarChart(
            'Топ проектов',
            'Лидеры рейтинга по итоговому баллу',
            topResultChartData,
            ' б.',
          )}
        </div>
      </div>
    );
  };

  const renderTeams = () => {
    const teams = data?.teams ?? [];
    const teamsWithoutLeader = teams.filter((team) => !team.leader_id);

    return (
      <div className="dashboard-stack">
        {teamsWithoutLeader.length > 0 && (
          <Card>
            <Card.Header>
              <Card.Title>Команды без доступа</Card.Title>
              <Card.Description>
                Создайте лидера и привяжите аккаунт к команде.
              </Card.Description>
            </Card.Header>
            <Card.Content className="access-list">
              {teamsWithoutLeader.map((team) => (
                <div className="access-row" key={idKey(team.id)}>
                  <div>
                    <strong>{team.team_name}</strong>
                    <span>{team.group_name ?? 'Группа не указана'}</span>
                  </div>
                  <Button onPress={() => openLeaderCreate(team)} variant="outline">
                    Создать доступ
                  </Button>
                </div>
              ))}
            </Card.Content>
          </Card>
        )}

        <DataTable
          ariaLabel="Команды"
          columns={[
            {
              isRowHeader: true,
              key: 'team',
              render: (team) => <strong>{team.team_name}</strong>,
              title: 'Команда',
            },
            {
              key: 'group',
              render: (team) => team.group_name ?? 'Нет группы',
              title: 'Группа',
            },
            {
              key: 'leader',
              render: (team) =>
                team.leader_id
                  ? usersById.get(idKey(team.leader_id))?.full_name ?? 'Не найден'
                  : 'Без лидера',
              title: 'Лидер',
            },
            {
              key: 'members',
              render: (team) => getTeamMembers(team.id).length,
              title: 'Участники',
            },
            {
              key: 'created',
              render: (team) => formatDate(team.created_at),
              title: 'Регистрация',
            },
            {
              key: 'access',
              render: (team) => (
                <Button
                  onPress={() => openLeaderAccess(team)}
                  size="sm"
                  variant="secondary"
                >
                  Выдать доступ
                </Button>
              ),
              title: 'Доступ',
            },
            {
              key: 'details',
              render: (team) => (
                <Button
                  onPress={() => setSelectedTeamId(idKey(team.id))}
                  size="sm"
                  variant="outline"
                >
                  Подробнее
                </Button>
              ),
              title: 'Детали',
            },
          ]}
          emptyText="Команд пока нет."
          getRowId={(team) => idKey(team.id)}
          isLoading={isLoading}
          onRowClick={(team) => setSelectedTeamId(idKey(team.id))}
          rows={teams}
        />
      </div>
    );
  };

  const renderProjects = () => (
    <div className="dashboard-stack">
      <div className="filters-row">
        <label className="dashboard-field">
          <span>Поиск</span>
          <Input
            onChange={(event) => setProjectSearch(event.target.value)}
            placeholder="Команда или проект"
            value={projectSearch}
          />
        </label>
        <SelectField
          label="Направление"
          onChange={setProjectDirection}
          options={directionOptions}
          value={projectDirection}
        />
      </div>
      <DataTable
        ariaLabel="Проекты"
        columns={[
          {
            isRowHeader: true,
            key: 'project',
            render: (project) => <strong>{project.title}</strong>,
            title: 'Проект',
          },
          {
            key: 'team',
            render: (project) =>
              teamsById.get(idKey(project.team_id))?.team_name ?? 'Без команды',
            title: 'Команда',
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
          {
            key: 'links',
            render: renderProjectLinks,
            title: 'Ссылки',
          },
        ]}
        emptyText="Проекты не найдены."
        getRowId={(project) => idKey(project.id)}
        isLoading={isLoading}
        onRowClick={(project) => setSelectedProjectId(idKey(project.id))}
        rows={filteredProjects}
      />
    </div>
  );

  const renderJury = () => {
    const jury = data?.users.filter((user) => user.role === 'jury') ?? [];

    return (
      <div className="dashboard-stack">
        <div className="section-actions">
          <Button onPress={openJuryCreate}>Создать жюри</Button>
        </div>
        <DataTable
          ariaLabel="Жюри"
          columns={[
            {
              isRowHeader: true,
              key: 'name',
              render: (user) => <strong>{user.full_name}</strong>,
              title: 'ФИО',
            },
            {
              key: 'login',
              render: (user) => user.login,
              title: 'Логин',
            },
            {
              key: 'created',
              render: (user) => formatDate(user.created_at),
              title: 'Создан',
            },
            {
              key: 'actions',
              render: (user) => (
                <div className="table-actions">
                  <Button
                    onPress={() => openJuryEdit(user)}
                    size="sm"
                    variant="outline"
                  >
                    Редактировать
                  </Button>
                  <Button
                    onPress={() => void handleDeleteJury(user)}
                    size="sm"
                    variant="danger-soft"
                  >
                    Удалить
                  </Button>
                </div>
              ),
              title: 'Действия',
            },
          ]}
          emptyText="Жюри пока не созданы."
          getRowId={(user) => idKey(user.id)}
          isLoading={isLoading}
          rows={jury}
        />
      </div>
    );
  };

  const renderCriteria = () => (
    <div className="dashboard-stack">
      <div className="section-actions">
        <Button onPress={openCriteriaCreate}>Создать критерий</Button>
      </div>
      <DataTable
        ariaLabel="Критерии"
        columns={[
          {
            isRowHeader: true,
            key: 'name',
            render: (criterion) => <strong>{criterion.name}</strong>,
            title: 'Название',
          },
          {
            key: 'description',
            render: (criterion) => criterion.description ?? 'Нет описания',
            title: 'Описание',
          },
          {
            key: 'max',
            render: (criterion) => criterion.max_score,
            title: 'Макс.',
          },
          {
            key: 'weight',
            render: (criterion) => criterion.weight,
            title: 'Вес',
          },
          {
            key: 'status',
            render: (criterion) => (
              <Chip
                color={criterion.is_active ? 'success' : 'warning'}
                variant="soft"
              >
                {criterion.is_active ? 'Активен' : 'Отключён'}
              </Chip>
            ),
            title: 'Статус',
          },
          {
            key: 'actions',
            render: (criterion) => (
              <div className="table-actions">
                <Button
                  onPress={() => openCriteriaEdit(criterion)}
                  size="sm"
                  variant="outline"
                >
                  Изменить
                </Button>
                <Button
                  onPress={() => void handleToggleCriterion(criterion)}
                  size="sm"
                  variant="secondary"
                >
                  {criterion.is_active ? 'Отключить' : 'Включить'}
                </Button>
                <Button
                  onPress={() => void handleDeleteCriterion(criterion)}
                  size="sm"
                  variant="danger-soft"
                >
                  Удалить
                </Button>
              </div>
            ),
            title: 'Действия',
          },
        ]}
        emptyText="Критерии пока не созданы."
        getRowId={(criterion) => idKey(criterion.id)}
        isLoading={isLoading}
        rows={data?.criteria ?? []}
      />
    </div>
  );

  const renderResults = () => (
    <DataTable
      ariaLabel="Результаты"
      columns={[
        {
          key: 'place',
          render: (_result, index) => index + 1,
          title: 'Место',
        },
        {
          key: 'team',
          render: (result) => <strong>{result.team_name}</strong>,
          title: 'Команда',
        },
        {
          isRowHeader: true,
          key: 'project',
          render: (result) => result.project_title,
          title: 'Проект',
        },
        {
          key: 'direction',
          render: (result) => result.direction ?? 'Не указано',
          title: 'Направление',
        },
        {
          key: 'score',
          render: (result) => Number(result.total_score ?? 0).toFixed(1),
          title: 'Балл',
        },
        {
          key: 'jury',
          render: (result) => result.jury_count ?? 0,
          title: 'Жюри',
        },
      ]}
      emptyText="Результатов пока нет."
      getRowId={(result) => idKey(result.project_id)}
      isLoading={isLoading}
      onRowClick={(result) => setSelectedResultId(idKey(result.project_id))}
      rows={data?.results ?? []}
    />
  );

  const renderNominations = () => {
    const projectOptions = activeProjects.map((project) => {
      const team = teamsById.get(idKey(project.team_id));
      return {
        label: `${team?.team_name ?? 'Без команды'} — ${project.title}`,
        value: idKey(project.id),
      };
    });

    return (
      <div className="nomination-grid">
        {(data?.nominations ?? []).map((nomination) => (
          <Card key={idKey(nomination.id)}>
            <Card.Header>
              <Card.Title>{nomination.name}</Card.Title>
              <Card.Description>
                {nomination.description ?? 'Описание не указано'}
              </Card.Description>
            </Card.Header>
            <Card.Content>
              <SelectField
                label="Победитель"
                onChange={(value) =>
                  setWinnerSelections((current) => ({
                    ...current,
                    [idKey(nomination.id)]: value,
                  }))
                }
                options={projectOptions}
                placeholder="Выберите проект"
                value={winnerSelections[idKey(nomination.id)] ?? ''}
              />
            </Card.Content>
            <Card.Footer>
              <Button onPress={() => void handleSaveWinner(nomination.id)}>
                Сохранить
              </Button>
            </Card.Footer>
          </Card>
        ))}
      </div>
    );
  };

  const renderArchive = () => (
    <div className="dashboard-stack">
      <div className="filters-row">
        <label className="dashboard-field">
          <span>Поиск</span>
          <Input
            onChange={(event) => setArchiveSearch(event.target.value)}
            placeholder="Команда или проект"
            value={archiveSearch}
          />
        </label>
        <SelectField
          label="Направление"
          onChange={setArchiveDirection}
          options={directionOptions}
          value={archiveDirection}
        />
      </div>
      {archivedProjects.length === 0 ? (
        <Card className="dashboard-state">
          <Card.Content>Архивных проектов пока нет.</Card.Content>
        </Card>
      ) : (
        <div className="archive-grid">
          {archivedProjects.map((project) => {
            const team = teamsById.get(idKey(project.team_id));

            return (
              <Card key={idKey(project.id)}>
                <Card.Header>
                  <Card.Title>{project.title}</Card.Title>
                  <Card.Description>
                    {team?.team_name ?? 'Без команды'}
                  </Card.Description>
                </Card.Header>
                <Card.Content>
                  <p>{project.short_description ?? 'Описание не заполнено'}</p>
                </Card.Content>
                <Card.Footer>
                  <Chip color="warning" variant="soft">
                    {project.direction ?? 'Без направления'}
                  </Chip>
                  <Button
                    onPress={() => setSelectedProjectId(idKey(project.id))}
                    variant="outline"
                  >
                    Открыть
                  </Button>
                </Card.Footer>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <DashboardLayout
      currentUser={currentUser}
      eyebrow="Администрирование"
      subtitle="Команды, проекты, жюри, оценки и победители BashtUp III"
      title="Админ-панель"
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
          <Tabs.List aria-label="Разделы админки">
            <Tabs.Tab id="overview">Обзор</Tabs.Tab>
            <Tabs.Tab id="teams">Команды</Tabs.Tab>
            <Tabs.Tab id="projects">Проекты</Tabs.Tab>
            <Tabs.Tab id="jury">Жюри</Tabs.Tab>
            <Tabs.Tab id="criteria">Критерии</Tabs.Tab>
            <Tabs.Tab id="results">Результаты</Tabs.Tab>
            <Tabs.Tab id="nominations">Номинации</Tabs.Tab>
            <Tabs.Tab id="archive">Архив</Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
        <Tabs.Panel id="overview">{renderOverview()}</Tabs.Panel>
        <Tabs.Panel id="teams">{renderTeams()}</Tabs.Panel>
        <Tabs.Panel id="projects">{renderProjects()}</Tabs.Panel>
        <Tabs.Panel id="jury">{renderJury()}</Tabs.Panel>
        <Tabs.Panel id="criteria">{renderCriteria()}</Tabs.Panel>
        <Tabs.Panel id="results">{renderResults()}</Tabs.Panel>
        <Tabs.Panel id="nominations">{renderNominations()}</Tabs.Panel>
        <Tabs.Panel id="archive">{renderArchive()}</Tabs.Panel>
      </Tabs>

      {selectedTeam && (
        <DashboardModal
          isOpen={Boolean(selectedTeam)}
          onClose={() => setSelectedTeamId(null)}
          title={selectedTeam.team_name}
        >
          <div className="detail-grid">
            <div>
              <span>Группа</span>
              <strong>{selectedTeam.group_name ?? 'Не указана'}</strong>
            </div>
            {selectedTeam.external_place && (
              <div>
                <span>Откуда</span>
                <strong>{selectedTeam.external_place}</strong>
              </div>
            )}
            <div>
              <span>Лидер</span>
              <strong>
                {selectedTeam.leader_id
                  ? usersById.get(idKey(selectedTeam.leader_id))?.full_name ??
                    'Не найден'
                  : 'Не привязан'}
              </strong>
            </div>
            <div>
              <span>Telegram</span>
              <strong>
                {selectedTeam.leader_id
                  ? usersById.get(idKey(selectedTeam.leader_id))?.telegram ??
                    'Не указан'
                  : 'Не указан'}
              </strong>
            </div>
            <div>
              <span>Телефон</span>
              <strong>
                {selectedTeam.leader_id
                  ? usersById.get(idKey(selectedTeam.leader_id))?.phone ??
                    'Не указан'
                  : 'Не указан'}
              </strong>
            </div>
          </div>
          <div className="members-list">
            <h3>Участники</h3>
            {getTeamMembers(selectedTeam.id).length > 0 ? (
              getTeamMembers(selectedTeam.id).map((member) => (
                <span key={idKey(member.id)}>{member.full_name}</span>
              ))
            ) : (
              <p className="muted-text">Участники не найдены.</p>
            )}
          </div>
        </DashboardModal>
      )}

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

      {selectedResult && resultProject && (
        <DashboardModal
          isOpen={Boolean(selectedResult)}
          onClose={() => setSelectedResultId(null)}
          title={`Результат: ${selectedResult.project_title}`}
        >
          <ProjectDetails
            project={resultProject}
            team={teamsById.get(idKey(resultProject.team_id))}
          />
          <h3 className="modal-subtitle">Оценки по критериям</h3>
          {renderScoreSummary(selectedResult.project_id)}
        </DashboardModal>
      )}

      <DashboardModal
        isOpen={Boolean(userModal)}
        onClose={() => setUserModal(null)}
        title={
          userModal?.mode === 'jury-edit'
            ? 'Редактировать жюри'
            : userModal?.mode === 'leader-create'
              ? 'Создать доступ для команды'
              : userModal?.mode === 'leader-edit'
                ? 'Выдать новый доступ лидеру'
              : 'Создать жюри'
        }
      >
        <form className="dashboard-form" id="user-form" onSubmit={submitUserForm}>
          <label className="dashboard-field">
            <span>ФИО</span>
            <Input
              disabled={isSaving}
              onChange={(event) =>
                setUserForm((current) => ({
                  ...current,
                  full_name: event.target.value,
                }))
              }
              value={userForm.full_name}
            />
          </label>
          <label className="dashboard-field">
            <span>Логин</span>
            <Input
              disabled={isSaving}
              onChange={(event) =>
                setUserForm((current) => ({
                  ...current,
                  login: event.target.value,
                }))
              }
              value={userForm.login}
            />
          </label>
          <label className="dashboard-field">
            <span>
              {userModal?.mode === 'jury-edit' ? 'Новый пароль' : 'Пароль'}
            </span>
            <Input
              disabled={isSaving}
              onChange={(event) =>
                setUserForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              type="password"
              value={userForm.password}
            />
          </label>
          <Card className="credential-preview">
            <Card.Header>
              <Card.Title>Доступ для отправки</Card.Title>
              <Card.Description>
                Копируется сразу ссылка, логин и пароль.
              </Card.Description>
            </Card.Header>
            <Card.Content>
              <pre className="credential-preview-text">
                {buildCredentialsText()}
              </pre>
              <div className="credential-actions">
                <Button
                  onPress={generateUserCredentials}
                  type="button"
                  variant="outline"
                >
                  Сгенерировать
                </Button>
                <Button
                  onPress={() => void copyCredentialsToClipboard()}
                  type="button"
                  variant="secondary"
                >
                  Скопировать логин и пароль
                </Button>
              </div>
            </Card.Content>
          </Card>
          {(userModal?.mode === 'leader-create' ||
            userModal?.mode === 'leader-edit') && (
            <div className="form-grid-2">
              <label className="dashboard-field">
                <span>Телефон</span>
                <Input
                  disabled={isSaving}
                  onChange={(event) =>
                    setUserForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  value={userForm.phone}
                />
              </label>
              <label className="dashboard-field">
                <span>Telegram</span>
                <Input
                  disabled={isSaving}
                  onChange={(event) =>
                    setUserForm((current) => ({
                      ...current,
                      telegram: event.target.value,
                    }))
                  }
                  value={userForm.telegram}
                />
              </label>
            </div>
          )}
          <Button isDisabled={isSaving} type="submit">
            {isSaving ? 'Сохраняем...' : 'Сохранить'}
          </Button>
        </form>
      </DashboardModal>

      <DashboardModal
        isOpen={Boolean(criteriaModal)}
        onClose={() => setCriteriaModal(null)}
        title={
          criteriaModal?.mode === 'edit'
            ? 'Редактировать критерий'
            : 'Создать критерий'
        }
      >
        <form
          className="dashboard-form"
          id="criteria-form"
          onSubmit={submitCriteriaForm}
        >
          <label className="dashboard-field">
            <span>Название</span>
            <Input
              disabled={isSaving}
              onChange={(event) =>
                setCriteriaForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              value={criteriaForm.name}
            />
          </label>
          <label className="dashboard-field">
            <span>Описание</span>
            <TextArea
              disabled={isSaving}
              onChange={(event) =>
                setCriteriaForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              value={criteriaForm.description}
            />
          </label>
          <div className="form-grid-2">
            <label className="dashboard-field">
              <span>Максимальный балл</span>
              <Input
                disabled={isSaving}
                min={0}
                onChange={(event) =>
                  setCriteriaForm((current) => ({
                    ...current,
                    max_score: event.target.value,
                  }))
                }
                type="number"
                value={criteriaForm.max_score}
              />
            </label>
            <label className="dashboard-field">
              <span>Вес</span>
              <Input
                disabled={isSaving}
                min={0}
                onChange={(event) =>
                  setCriteriaForm((current) => ({
                    ...current,
                    weight: event.target.value,
                  }))
                }
                step="0.1"
                type="number"
                value={criteriaForm.weight}
              />
            </label>
          </div>
          <label className="dashboard-checkbox">
            <input
              checked={criteriaForm.is_active}
              disabled={isSaving}
              onChange={(event) =>
                setCriteriaForm((current) => ({
                  ...current,
                  is_active: event.target.checked,
                }))
              }
              type="checkbox"
            />
            Активный критерий
          </label>
          <Button isDisabled={isSaving} type="submit">
            {isSaving ? 'Сохраняем...' : 'Сохранить'}
          </Button>
        </form>
      </DashboardModal>
    </DashboardLayout>
  );
}
