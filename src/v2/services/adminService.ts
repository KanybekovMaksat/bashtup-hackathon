import { V2ApiError, apiRequest } from './apiClient';
import {
  asArray,
  asRecord,
  normalizeAdminProject,
  normalizeCriterion,
  normalizeDirection,
  normalizeResultRow,
  normalizeUser,
  numberValue,
  pickData,
  text,
} from './normalizers';
import type {
  AdminDashboardStats,
  AdminProject,
  AdminUser,
  Analytics,
  CreateUserPayload,
  CreateUserResult,
  Direction,
  Nomination,
  ResetPasswordResult,
  UpdateUserPayload,
  UserRole,
} from '../types';

type ListFilters = Record<string, string | number | undefined>;

type CriterionPayload = {
  title: string;
  description?: string | null;
  maxScore: number;
  weight: number;
  order: number;
  isRequired: boolean;
  isActive: boolean;
};

type NominationPayload = {
  title: string;
  description?: string | null;
  winnerProjectId?: string | null;
};

type ProjectUpdatePayload = Partial<AdminProject> & {
  juryIds?: string[];
};

const HACKATHON_ID =
  (import.meta.env.VITE_HACKATHON_ID as string | undefined)?.trim() || '';
const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/;

let cachedHackathonId: string | null = OBJECT_ID_PATTERN.test(HACKATHON_ID)
  ? HACKATHON_ID
  : null;

function withQuery(path: string, filters: ListFilters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && String(value).trim()) {
      params.set(key, String(value));
    }
  });

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

async function getHackathonId() {
  if (cachedHackathonId) {
    return cachedHackathonId;
  }

  if (HACKATHON_ID && !OBJECT_ID_PATTERN.test(HACKATHON_ID)) {
    throw new V2ApiError('VITE_HACKATHON_ID должен быть Mongo ObjectId', 400);
  }

  const response = await apiRequest<unknown>('/admin/hackathons');
  const root = asRecord(response);
  const data = asRecord(root.data);
  const hackathons =
    [
      asArray(root.hackathons),
      asArray(data.hackathons),
      asArray(root.items),
      asArray(data.items),
      asArray(root.data),
    ].find((items) => items.length > 0) ?? [];
  const active =
    hackathons.find((item) => {
      const record = asRecord(item);
      const status = text(record, ['status']);
      const isMarkedActive = Boolean(
        record.isActive ?? record.is_active ?? record.active,
      );

      return isMarkedActive || status === 'active' || status === 'evaluation';
    }) ?? hackathons[0];
  const hackathonId = text(asRecord(active), [
    'id',
    '_id',
    'hackathonId',
    'hackathon_id',
  ]);

  if (!OBJECT_ID_PATTERN.test(hackathonId)) {
    throw new V2ApiError(
      'Активный хакатон не найден. Создайте хакатон в админ API или укажите VITE_HACKATHON_ID.',
      404,
    );
  }

  cachedHackathonId = hackathonId;
  return cachedHackathonId;
}

function normalizeAdminUser(value: unknown): AdminUser {
  const record = asRecord(value);

  return {
    ...normalizeUser(value),
    createdAt: text(record, ['createdAt', 'created_at']) || null,
  };
}

function normalizeCreateUserResult(value: unknown): CreateUserResult {
  const record = asRecord(value);
  const data = asRecord(record.data ?? value);

  return {
    temporaryPassword:
      text(data, ['temporaryPassword', 'temporary_password', 'password']) || null,
    user: normalizeAdminUser(data.user ?? value),
  };
}

function normalizeNomination(value: unknown): Nomination {
  const record = asRecord(value);

  return {
    description: text(record, ['description']) || null,
    id: text(record, ['id', 'nominationId', 'nomination_id']),
    title: text(record, ['title', 'name'], 'Номинация'),
    winnerProjectId:
      text(record, ['winnerProjectId', 'winner_project_id', 'projectWinnerId']) ||
      null,
  };
}

function toApiCriterion(payload: CriterionPayload) {
  return {
    description: payload.description ?? null,
    isActive: payload.isActive,
    isRequired: payload.isRequired,
    maxScore: payload.maxScore,
    order: payload.order,
    title: payload.title,
    weight: payload.weight,
  };
}

function toApiNomination(payload: NominationPayload) {
  return {
    description: payload.description ?? null,
    title: payload.title,
    winnerProjectId: payload.winnerProjectId ?? null,
  };
}

export async function fetchAdminUsers(filters: {
  role?: UserRole | '';
  search?: string;
} = {}) {
  const response = await apiRequest<unknown>(
    withQuery('/admin/users', {
      role: filters.role || undefined,
      search: filters.search,
    }),
  );

  return asArray(pickData(response, ['users'])).map(normalizeAdminUser);
}

export async function createAdminUser(payload: CreateUserPayload) {
  const response = await apiRequest<unknown>('/admin/users', {
    body: payload,
    method: 'POST',
  });

  return normalizeCreateUserResult(response);
}

export async function updateAdminUser(
  userId: string,
  payload: UpdateUserPayload,
) {
  const response = await apiRequest<unknown>(`/admin/users/${encodeURIComponent(userId)}`, {
    body: payload,
    method: 'PATCH',
  });
  const record = asRecord(response);

  return normalizeAdminUser(record.user ?? record.data ?? response);
}

export async function resetAdminUserPassword(userId: string) {
  const response = await apiRequest<unknown>(
    `/admin/users/${encodeURIComponent(userId)}/reset-password`,
    { method: 'POST' },
  );
  const record = asRecord(response);
  const data = asRecord(record.data ?? response);

  return {
    temporaryPassword: text(data, [
      'temporaryPassword',
      'temporary_password',
      'password',
    ]),
  } satisfies ResetPasswordResult;
}

export async function blockAdminUser(userId: string, blocked: boolean) {
  await apiRequest<unknown>(`/admin/users/${encodeURIComponent(userId)}/block`, {
    body: { blocked },
    method: 'PATCH',
  });
}

export async function fetchDirections() {
  const hackathonId = await getHackathonId();
  const response = await apiRequest<unknown>(
    `/admin/hackathons/${encodeURIComponent(hackathonId)}/directions`,
  );

  return asArray(pickData(response, ['directions'])).map(normalizeDirection);
}

export async function fetchAdminProjects(filters: ListFilters = {}) {
  const hackathonId = await getHackathonId();
  const response = await apiRequest<unknown>(
    withQuery(
      `/admin/hackathons/${encodeURIComponent(hackathonId)}/projects`,
      filters,
    ),
  );

  return asArray(pickData(response, ['projects'])).map(normalizeAdminProject);
}

export async function fetchAdminProject(projectId: string) {
  const response = await apiRequest<unknown>(
    `/admin/projects/${encodeURIComponent(projectId)}`,
  );
  const record = asRecord(response);

  return normalizeAdminProject(record.project ?? record.data ?? response);
}

export async function updateAdminProject(
  projectId: string,
  payload: ProjectUpdatePayload,
) {
  const response = await apiRequest<unknown>(
    `/admin/projects/${encodeURIComponent(projectId)}`,
    {
      body: payload,
      method: 'PATCH',
    },
  );
  const record = asRecord(response);

  return normalizeAdminProject(record.project ?? record.data ?? response);
}

export async function assignProjectJury(projectId: string, juryIds: string[]) {
  await apiRequest<unknown>('/admin/jury-assignments', {
    body: { juryIds, projectId },
    method: 'POST',
  });
}

export async function fetchCriteria() {
  const hackathonId = await getHackathonId();
  const response = await apiRequest<unknown>(
    `/admin/hackathons/${encodeURIComponent(hackathonId)}/criteria`,
  );

  return asArray(pickData(response, ['criteria'])).map(normalizeCriterion);
}

export async function createCriterion(payload: CriterionPayload) {
  const hackathonId = await getHackathonId();
  const response = await apiRequest<unknown>(
    `/admin/hackathons/${encodeURIComponent(hackathonId)}/criteria`,
    {
      body: toApiCriterion(payload),
      method: 'POST',
    },
  );
  const record = asRecord(response);

  return normalizeCriterion(record.criterion ?? record.data ?? response);
}

export async function updateCriterion(
  criterionId: string,
  payload: CriterionPayload,
) {
  const response = await apiRequest<unknown>(
    `/admin/criteria/${encodeURIComponent(criterionId)}`,
    {
      body: toApiCriterion(payload),
      method: 'PATCH',
    },
  );
  const record = asRecord(response);

  return normalizeCriterion(record.criterion ?? record.data ?? response);
}

export async function archiveCriterion(criterionId: string) {
  await apiRequest<unknown>(
    `/admin/criteria/${encodeURIComponent(criterionId)}/archive`,
    { method: 'PATCH' },
  );
}

export async function fetchNominations() {
  const hackathonId = await getHackathonId();
  const response = await apiRequest<unknown>(
    `/admin/hackathons/${encodeURIComponent(hackathonId)}/nominations`,
  );

  return asArray(pickData(response, ['nominations'])).map(normalizeNomination);
}

export async function createNomination(payload: NominationPayload) {
  const hackathonId = await getHackathonId();
  const response = await apiRequest<unknown>(
    `/admin/hackathons/${encodeURIComponent(hackathonId)}/nominations`,
    {
      body: toApiNomination(payload),
      method: 'POST',
    },
  );
  const record = asRecord(response);

  return normalizeNomination(record.nomination ?? record.data ?? response);
}

export async function updateNomination(
  nominationId: string,
  payload: NominationPayload,
) {
  const response = await apiRequest<unknown>(
    `/admin/nominations/${encodeURIComponent(nominationId)}`,
    {
      body: toApiNomination(payload),
      method: 'PATCH',
    },
  );
  const record = asRecord(response);

  return normalizeNomination(record.nomination ?? record.data ?? response);
}

export async function fetchResults() {
  const hackathonId = await getHackathonId();
  const response = await apiRequest<unknown>(
    `/admin/hackathons/${encodeURIComponent(hackathonId)}/results`,
  );

  return asArray(pickData(response, ['results'])).map(normalizeResultRow);
}

export async function publishResults() {
  const hackathonId = await getHackathonId();
  await apiRequest<unknown>(
    `/admin/hackathons/${encodeURIComponent(hackathonId)}/results/publish`,
    { method: 'POST' },
  );
}

export async function fetchAnalytics(): Promise<Analytics> {
  const hackathonId = await getHackathonId();
  const response = await apiRequest<unknown>(
    `/admin/hackathons/${encodeURIComponent(hackathonId)}/analytics`,
  );
  const record = asRecord(pickData(response, ['analytics']));

  return {
    draftProjects: numberValue(record, ['draftProjects', 'draft_projects']),
    evaluatedProjects: numberValue(record, [
      'evaluatedProjects',
      'evaluated_projects',
    ]),
    juryProgress: asArray(record.juryProgress ?? record.jury_progress).map(
      (item) => {
        const itemRecord = asRecord(item);
        return {
          assigned: numberValue(itemRecord, ['assigned', 'assignedProjects']),
          evaluated: numberValue(itemRecord, ['evaluated', 'evaluatedProjects']),
          name: text(itemRecord, ['name', 'fullName', 'full_name'], 'Жюри'),
        };
      },
    ),
    notEvaluatedProjects: numberValue(record, [
      'notEvaluatedProjects',
      'not_evaluated_projects',
    ]),
    projectsByCourse: asArray(record.projectsByCourse ?? record.projects_by_course).map(
      (item) => {
        const itemRecord = asRecord(item);
        return {
          count: numberValue(itemRecord, ['count']),
          name: text(itemRecord, ['name', 'course'], 'Курс'),
        };
      },
    ),
    projectsByDirection: asArray(
      record.projectsByDirection ?? record.projects_by_direction,
    ).map((item) => {
      const itemRecord = asRecord(item);
      return {
        count: numberValue(itemRecord, ['count']),
        name: text(itemRecord, ['name', 'direction'], 'Направление'),
      };
    }),
    submittedProjects: numberValue(record, [
      'submittedProjects',
      'submitted_projects',
    ]),
    totalProjects: numberValue(record, ['totalProjects', 'total_projects']),
  };
}

export async function fetchAdminDashboard(): Promise<AdminDashboardStats> {
  const [users, projects] = await Promise.all([
    fetchAdminUsers(),
    fetchAdminProjects(),
  ]);
  const submittedProjects = projects.filter((project) =>
    ['submitted', 'under_review', 'evaluated', 'published'].includes(project.status),
  ).length;
  const evaluatedProjects = projects.filter((project) =>
    ['evaluated', 'published'].includes(project.status),
  ).length;

  return {
    draftProjects: projects.filter((project) => project.status === 'draft').length,
    evaluationProgress: projects.length
      ? Math.round((evaluatedProjects / projects.length) * 100)
      : 0,
    jury: users.filter((user) => user.role === 'jury').length,
    participants: users.filter((user) => user.role === 'participant').length,
    submittedProjects,
    totalProjects: projects.length,
  };
}

export type { CriterionPayload, Direction, NominationPayload, ProjectUpdatePayload };
