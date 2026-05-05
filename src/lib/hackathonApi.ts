import { getSupabaseClient } from './supabase';
import type {
  AdminData,
  Analytics,
  AppUser,
  Criterion,
  EntityId,
  JuryWorkspace,
  ParticipantWorkspace,
  Project,
  ProjectResult,
  Score,
  Team,
  TeamMember,
  Winner,
  Nomination,
  Role,
} from './hackathonTypes';

export type UserPayload = {
  full_name: string;
  login: string;
  password?: string;
  role: Role;
  phone?: string | null;
  telegram?: string | null;
};

export type CriterionPayload = {
  name: string;
  description: string | null;
  max_score: number;
  weight: number;
  is_active: boolean;
};

export type ProjectPayload = {
  title: string;
  direction: string;
  short_description: string;
  full_description: string;
  problem: string;
  solution: string;
  target_audience: string;
  mvp_link: string | null;
  presentation_link: string | null;
  github_link: string | null;
  video_link: string | null;
};

export type JuryScorePayload = {
  criteria_id: EntityId;
  score: number;
  comment: string | null;
};

export type RegisterTeamPayload = {
  teamName: string;
  groupName: string | null;
  externalPlace: string | null;
  leaderFullName: string;
  leaderPhone: string;
  leaderTelegram: string;
  members: string[];
};

export type RegisterTeamResult = {
  credentials: {
    login: string;
    password: string;
  };
  leader: AppUser;
  members: TeamMember[];
  team: Team;
};

const USER_SELECT =
  'id, full_name, login, role, phone, telegram, created_at';
const LOGIN_GENERATION_ATTEMPTS = 5;

type LoginFunctionUser = Omit<AppUser, 'created_at'> & {
  created_at?: string | null;
};

type LoginFunctionResponse = {
  user?: LoginFunctionUser | null;
  error?: string;
};

function raiseIfError(
  error: { message?: string } | null,
  fallbackMessage: string,
) {
  if (error) {
    throw new Error(error.message || fallbackMessage);
  }
}

function toArray<T>(data: T[] | null): T[] {
  return data ?? [];
}

function getErrorContextResponse(error: unknown): Response | null {
  if (
    typeof Response === 'undefined' ||
    typeof error !== 'object' ||
    error === null ||
    !('context' in error)
  ) {
    return null;
  }

  const context = (error as { context?: unknown }).context;

  return context instanceof Response ? context : null;
}

async function getFunctionErrorMessage(
  error: unknown,
  fallbackMessage: string,
) {
  const response = getErrorContextResponse(error);

  if (response) {
    try {
      const payload = (await response.clone().json()) as { error?: unknown };

      if (typeof payload.error === 'string' && payload.error.trim()) {
        return payload.error;
      }
    } catch {
      // The function did not return a JSON error payload.
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

function normalizeLoggedInUser(user: LoginFunctionUser): AppUser {
  return {
    ...user,
    created_at: user.created_at ?? null,
  };
}

function asNumber(value: unknown) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
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

function isUniqueViolation(error: { code?: string } | null) {
  return error?.code === '23505';
}

function computeAnalytics(
  teams: Team[],
  members: TeamMember[],
  projects: Project[],
  scores: Score[],
): Analytics {
  return {
    total_jury_voted: new Set(scores.map((score) => String(score.jury_id)))
      .size,
    total_members: members.length,
    total_projects: projects.length,
    total_teams: teams.length,
  };
}

function computeProjectResults(
  projects: Project[],
  teams: Team[],
  scores: Score[],
  criteria: Criterion[],
): ProjectResult[] {
  const criteriaById = new Map(
    criteria.map((criterion) => [String(criterion.id), criterion]),
  );

  return projects
    .filter((project) => !project.is_archived)
    .map((project) => {
      const projectScores = scores.filter(
        (score) => String(score.project_id) === String(project.id),
      );
      const totalScore = projectScores.reduce((sum, score) => {
        const criterion = criteriaById.get(String(score.criteria_id));
        return sum + asNumber(score.score) * asNumber(criterion?.weight ?? 1);
      }, 0);
      const team = teams.find(
        (item) => String(item.id) === String(project.team_id),
      );

      return {
        direction: project.direction,
        jury_count: new Set(
          projectScores.map((score) => String(score.jury_id)),
        ).size,
        project_id: project.id,
        project_title: project.title,
        short_description: project.short_description,
        team_name: team?.team_name ?? 'Без команды',
        total_score: totalScore,
      };
    })
    .sort((left, right) => asNumber(right.total_score) - asNumber(left.total_score));
}

export async function loginWithPassword(
  login: string,
  password: string,
): Promise<AppUser | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke<LoginFunctionResponse>(
    'quick-api',
    {
      body: { login, password },
    },
  );

  if (error) {
    throw new Error(
      await getFunctionErrorMessage(
        error,
        '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0432\u044b\u043f\u043e\u043b\u043d\u0438\u0442\u044c \u0432\u0445\u043e\u0434.',
      ),
    );
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data?.user ? normalizeLoggedInUser(data.user) : null;
}

export async function fetchAdminData(): Promise<AdminData> {
  const supabase = getSupabaseClient();
  const [
    usersResponse,
    teamsResponse,
    membersResponse,
    projectsResponse,
    criteriaResponse,
    scoresResponse,
    nominationsResponse,
    winnersResponse,
    resultsResponse,
    analyticsResponse,
  ] = await Promise.all([
    supabase.from('users').select(USER_SELECT).order('created_at', {
      ascending: false,
    }),
    supabase.from('teams').select('*').order('created_at', {
      ascending: false,
    }),
    supabase.from('team_members').select('*').order('created_at', {
      ascending: true,
    }),
    supabase.from('projects').select('*').order('created_at', {
      ascending: false,
    }),
    supabase.from('criteria').select('*').order('created_at', {
      ascending: true,
    }),
    supabase.from('scores').select('*').order('created_at', {
      ascending: false,
    }),
    supabase.from('nominations').select('*').order('created_at', {
      ascending: true,
    }),
    supabase.from('winners').select('*').order('created_at', {
      ascending: false,
    }),
    supabase.from('project_results').select('*'),
    supabase.from('analytics').select('*').limit(1).maybeSingle(),
  ]);

  raiseIfError(usersResponse.error, 'Не удалось загрузить пользователей.');
  raiseIfError(teamsResponse.error, 'Не удалось загрузить команды.');
  raiseIfError(membersResponse.error, 'Не удалось загрузить участников.');
  raiseIfError(projectsResponse.error, 'Не удалось загрузить проекты.');
  raiseIfError(criteriaResponse.error, 'Не удалось загрузить критерии.');
  raiseIfError(scoresResponse.error, 'Не удалось загрузить оценки.');
  raiseIfError(nominationsResponse.error, 'Не удалось загрузить номинации.');
  raiseIfError(winnersResponse.error, 'Не удалось загрузить победителей.');

  const users = toArray(usersResponse.data as AppUser[] | null);
  const teams = toArray(teamsResponse.data as Team[] | null);
  const members = toArray(membersResponse.data as TeamMember[] | null);
  const projects = toArray(projectsResponse.data as Project[] | null);
  const criteria = toArray(criteriaResponse.data as Criterion[] | null);
  const scores = toArray(scoresResponse.data as Score[] | null);
  const nominations = toArray(
    nominationsResponse.data as Nomination[] | null,
  );
  const winners = toArray(winnersResponse.data as Winner[] | null);
  const fallbackAnalytics = computeAnalytics(teams, members, projects, scores);
  const fallbackResults = computeProjectResults(projects, teams, scores, criteria);

  if (resultsResponse.error) {
    console.warn(resultsResponse.error.message);
  }

  if (analyticsResponse.error) {
    console.warn(analyticsResponse.error.message);
  }

  return {
    analytics:
      ((analyticsResponse.data as Analytics | null) ?? fallbackAnalytics),
    criteria,
    members,
    nominations,
    projects,
    results: resultsResponse.error
      ? fallbackResults
      : toArray(resultsResponse.data as ProjectResult[] | null).sort(
          (left, right) =>
            asNumber(right.total_score) - asNumber(left.total_score),
        ),
    scores,
    teams,
    users,
    winners,
  };
}

export async function createUser(payload: UserPayload): Promise<AppUser> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .insert({
      full_name: payload.full_name,
      login: payload.login,
      password: payload.password,
      phone: payload.phone ?? null,
      role: payload.role,
      telegram: payload.telegram ?? null,
    })
    .select(USER_SELECT)
    .single();

  raiseIfError(error, 'Не удалось создать пользователя.');
  return data as AppUser;
}

export async function updateUser(
  userId: EntityId,
  payload: Partial<UserPayload>,
): Promise<AppUser> {
  const supabase = getSupabaseClient();
  const updatePayload: Record<string, string | null | undefined> = {
    full_name: payload.full_name,
    login: payload.login,
    password: payload.password || undefined,
    phone: payload.phone,
    telegram: payload.telegram,
  };

  Object.keys(updatePayload).forEach((key) => {
    if (updatePayload[key] === undefined) {
      delete updatePayload[key];
    }
  });

  const { data, error } = await supabase
    .from('users')
    .update(updatePayload)
    .eq('id', userId)
    .select(USER_SELECT)
    .single();

  raiseIfError(error, 'Не удалось обновить пользователя.');
  return data as AppUser;
}

export async function deleteUser(userId: EntityId) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('users').delete().eq('id', userId);

  raiseIfError(error, 'Не удалось удалить пользователя.');
}

export async function linkLeaderToTeam(teamId: EntityId, leaderId: EntityId) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('teams')
    .update({ leader_id: leaderId })
    .eq('id', teamId);

  raiseIfError(error, 'Не удалось привязать лидера к команде.');
}

export async function createLeaderForTeam(
  teamId: EntityId,
  payload: Omit<UserPayload, 'role'>,
) {
  const leader = await createUser({ ...payload, role: 'leader' });
  await linkLeaderToTeam(teamId, leader.id);
  return leader;
}

async function createRegistrationLeader(
  supabase: ReturnType<typeof getSupabaseClient>,
  payload: RegisterTeamPayload,
) {
  for (let attempt = 0; attempt < LOGIN_GENERATION_ATTEMPTS; attempt += 1) {
    const credentials = {
      login: generateLogin(payload.teamName, 'leader'),
      password: generatePassword(),
    };
    const { data, error } = await supabase
      .from('users')
      .insert({
        full_name: payload.leaderFullName,
        login: credentials.login,
        password: credentials.password,
        phone: payload.leaderPhone,
        role: 'leader',
        telegram: payload.leaderTelegram,
      })
      .select(USER_SELECT)
      .single();

    if (!error) {
      return {
        credentials,
        leader: data as AppUser,
      };
    }

    if (!isUniqueViolation(error)) {
      raiseIfError(error, 'Не удалось создать лидера команды.');
    }
  }

  throw new Error('Не удалось создать уникальный логин лидера.');
}

export async function registerTeam(
  payload: RegisterTeamPayload,
): Promise<RegisterTeamResult> {
  const supabase = getSupabaseClient();
  const memberRows = payload.members
    .map((member) => member.trim())
    .filter(Boolean)
    .map((fullName) => ({ full_name: fullName }));
  let createdLeaderId: EntityId | null = null;
  let createdTeamId: EntityId | null = null;

  try {
    const teamResponse = await supabase
      .from('teams')
      .insert({
        external_place: payload.externalPlace,
        group_name: payload.groupName,
        leader_id: null,
        team_name: payload.teamName,
      })
      .select('*')
      .single();

    raiseIfError(teamResponse.error, 'Не удалось создать команду.');

    const createdTeam = teamResponse.data as Team;
    createdTeamId = createdTeam.id;

    const membersResponse =
      memberRows.length > 0
        ? await supabase
            .from('team_members')
            .insert(
              memberRows.map((member) => ({
                ...member,
                team_id: createdTeam.id,
              })),
            )
            .select('*')
        : { data: [], error: null };

    raiseIfError(membersResponse.error, 'Не удалось создать участников.');

    const { credentials, leader } = await createRegistrationLeader(
      supabase,
      payload,
    );
    createdLeaderId = leader.id;

    const linkedTeamResponse = await supabase
      .from('teams')
      .update({ leader_id: leader.id })
      .eq('id', createdTeam.id)
      .select('*')
      .single();

    raiseIfError(
      linkedTeamResponse.error,
      'Не удалось привязать лидера к команде.',
    );

    return {
      credentials,
      leader,
      members: toArray(membersResponse.data as TeamMember[] | null),
      team: linkedTeamResponse.data as Team,
    };
  } catch (error) {
    if (createdTeamId !== null) {
      await supabase.from('team_members').delete().eq('team_id', createdTeamId);
      await supabase.from('teams').delete().eq('id', createdTeamId);
    }

    if (createdLeaderId !== null) {
      await supabase.from('users').delete().eq('id', createdLeaderId);
    }

    throw error;
  }
}

export async function createCriterion(payload: CriterionPayload) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('criteria')
    .insert(payload)
    .select('*')
    .single();

  raiseIfError(error, 'Не удалось создать критерий.');
  return data as Criterion;
}

export async function updateCriterion(
  criterionId: EntityId,
  payload: CriterionPayload,
) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('criteria')
    .update(payload)
    .eq('id', criterionId)
    .select('*')
    .single();

  raiseIfError(error, 'Не удалось обновить критерий.');
  return data as Criterion;
}

export async function deleteCriterion(criterionId: EntityId) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('criteria')
    .delete()
    .eq('id', criterionId);

  raiseIfError(error, 'Не удалось удалить критерий.');
}

export async function setCriterionActive(
  criterionId: EntityId,
  isActive: boolean,
) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('criteria')
    .update({ is_active: isActive })
    .eq('id', criterionId);

  raiseIfError(error, 'Не удалось изменить статус критерия.');
}

export async function saveWinner(
  nominationId: EntityId,
  projectId: EntityId,
) {
  const supabase = getSupabaseClient();
  const existingResponse = await supabase
    .from('winners')
    .select('id')
    .eq('nomination_id', nominationId)
    .limit(1)
    .maybeSingle();

  raiseIfError(existingResponse.error, 'Не удалось проверить победителя.');

  if (existingResponse.data?.id) {
    const { error } = await supabase
      .from('winners')
      .update({ project_id: projectId })
      .eq('id', existingResponse.data.id);

    raiseIfError(error, 'Не удалось обновить победителя.');
    return;
  }

  const { error } = await supabase.from('winners').insert({
    nomination_id: nominationId,
    project_id: projectId,
  });

  raiseIfError(error, 'Не удалось сохранить победителя.');
}

export async function fetchParticipantWorkspace(
  leaderId: EntityId,
): Promise<ParticipantWorkspace> {
  const supabase = getSupabaseClient();
  const teamResponse = await supabase
    .from('teams')
    .select('*')
    .eq('leader_id', leaderId)
    .limit(1)
    .maybeSingle();

  raiseIfError(teamResponse.error, 'Не удалось загрузить команду.');

  const team = (teamResponse.data as Team | null) ?? null;

  if (!team) {
    return {
      members: [],
      project: null,
      team: null,
    };
  }

  const [membersResponse, projectResponse] = await Promise.all([
    supabase
      .from('team_members')
      .select('*')
      .eq('team_id', team.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('projects')
      .select('*')
      .eq('team_id', team.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  raiseIfError(membersResponse.error, 'Не удалось загрузить участников.');
  raiseIfError(projectResponse.error, 'Не удалось загрузить проект.');

  return {
    members: toArray(membersResponse.data as TeamMember[] | null),
    project: (projectResponse.data as Project | null) ?? null,
    team,
  };
}

export async function saveProject(
  teamId: EntityId,
  payload: ProjectPayload,
  projectId?: EntityId,
) {
  const supabase = getSupabaseClient();
  const row = {
    ...payload,
    team_id: teamId,
    updated_at: new Date().toISOString(),
  };

  if (projectId !== undefined) {
    const { data, error } = await supabase
      .from('projects')
      .update(row)
      .eq('id', projectId)
      .select('*')
      .single();

    raiseIfError(error, 'Не удалось обновить проект.');
    return data as Project;
  }

  const { data, error } = await supabase
    .from('projects')
    .insert(row)
    .select('*')
    .single();

  raiseIfError(error, 'Не удалось создать проект.');
  return data as Project;
}

export async function fetchJuryWorkspace(
  juryId: EntityId,
): Promise<JuryWorkspace> {
  const supabase = getSupabaseClient();
  const [projectsResponse, teamsResponse, criteriaResponse, scoresResponse] =
    await Promise.all([
      supabase.from('projects').select('*').order('created_at', {
        ascending: false,
      }),
      supabase.from('teams').select('*'),
      supabase
        .from('criteria')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true }),
      supabase
        .from('scores')
        .select('*')
        .eq('jury_id', juryId)
        .order('created_at', { ascending: false }),
    ]);

  raiseIfError(projectsResponse.error, 'Не удалось загрузить проекты.');
  raiseIfError(teamsResponse.error, 'Не удалось загрузить команды.');
  raiseIfError(criteriaResponse.error, 'Не удалось загрузить критерии.');
  raiseIfError(scoresResponse.error, 'Не удалось загрузить оценки.');

  return {
    criteria: toArray(criteriaResponse.data as Criterion[] | null),
    projects: toArray(projectsResponse.data as Project[] | null),
    scores: toArray(scoresResponse.data as Score[] | null),
    teams: toArray(teamsResponse.data as Team[] | null),
  };
}

export async function fetchJuryScoresForProject(
  juryId: EntityId,
  projectId: EntityId,
) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .eq('jury_id', juryId)
    .eq('project_id', projectId);

  raiseIfError(error, 'Не удалось загрузить оценки проекта.');
  return toArray(data as Score[] | null);
}

export async function saveJuryScores(
  projectId: EntityId,
  juryId: EntityId,
  entries: JuryScorePayload[],
) {
  const supabase = getSupabaseClient();

  await Promise.all(
    entries.map(async (entry) => {
      const existingResponse = await supabase
        .from('scores')
        .select('id')
        .eq('project_id', projectId)
        .eq('jury_id', juryId)
        .eq('criteria_id', entry.criteria_id)
        .limit(1)
        .maybeSingle();

      raiseIfError(existingResponse.error, 'Не удалось проверить оценку.');

      if (existingResponse.data?.id) {
        const { error } = await supabase
          .from('scores')
          .update({
            comment: entry.comment,
            score: entry.score,
          })
          .eq('id', existingResponse.data.id);

        raiseIfError(error, 'Не удалось обновить оценку.');
        return;
      }

      const { error } = await supabase.from('scores').insert({
        comment: entry.comment,
        criteria_id: entry.criteria_id,
        jury_id: juryId,
        project_id: projectId,
        score: entry.score,
      });

      raiseIfError(error, 'Не удалось сохранить оценку.');
    }),
  );
}
