import type {
  AdminProject,
  Criterion,
  Direction,
  JuryProject,
  Project,
  ProjectStatus,
  ResultRow,
  Score,
  ScoreItem,
  Team,
  TeamMember,
  User,
  UserRole,
} from '../types';

export type UnknownRecord = Record<string, unknown>;

export function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function pickData(payload: unknown, keys: string[] = []) {
  const record = asRecord(payload);

  for (const key of keys) {
    if (record[key] !== undefined) {
      return record[key];
    }
  }

  return record.data ?? payload;
}

export function text(
  record: UnknownRecord,
  keys: string[],
  fallback = '',
) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number') {
      return String(value);
    }
  }

  return fallback;
}

export function nullableText(record: UnknownRecord, keys: string[]) {
  const value = text(record, keys);
  return value ? value : null;
}

export function numberValue(
  record: UnknownRecord,
  keys: string[],
  fallback = 0,
) {
  for (const key of keys) {
    const value = record[key];
    const numericValue =
      typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;

    if (Number.isFinite(numericValue)) {
      return numericValue;
    }
  }

  return fallback;
}

export function booleanValue(
  record: UnknownRecord,
  keys: string[],
  fallback = false,
) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === 'boolean') {
      return value;
    }
  }

  return fallback;
}

function normalizeRole(value: string): UserRole {
  if (value === 'admin' || value === 'jury' || value === 'participant') {
    return value;
  }

  return value === 'leader' ? 'participant' : 'participant';
}

function normalizeStatus(value: string): ProjectStatus {
  const statuses: ProjectStatus[] = [
    'draft',
    'submitted',
    'under_review',
    'evaluated',
    'rejected',
    'published',
  ];

  return statuses.includes(value as ProjectStatus)
    ? (value as ProjectStatus)
    : 'draft';
}

export function normalizeUser(value: unknown): User {
  const record = asRecord(value);

  return {
    email: nullableText(record, ['email']),
    fullName: text(record, ['fullName', 'full_name', 'name'], 'Без имени'),
    id: text(record, ['id', 'userId', 'user_id']),
    login: text(record, ['login', 'username']),
    mustChangePassword: booleanValue(record, [
      'mustChangePassword',
      'must_change_password',
    ]),
    role: normalizeRole(text(record, ['role'], 'participant')),
    status: text(record, ['status'], 'active') as User['status'],
  };
}

export function normalizeTeamMember(value: unknown): TeamMember {
  const record = asRecord(value);

  return {
    contact: nullableText(record, ['contact', 'phone', 'telegram', 'email']),
    course: numberValue(record, ['course'], 1),
    fullName: text(record, ['fullName', 'full_name', 'name']),
    group: nullableText(record, ['group', 'group_name']),
    roleInTeam: nullableText(record, ['roleInTeam', 'role_in_team']),
  };
}

export function normalizeTeam(value: unknown): Team {
  const record = asRecord(value);
  const members = asArray(record.members).map(normalizeTeamMember);

  return {
    id: text(record, ['id', 'teamId', 'team_id']),
    members,
    name: text(record, ['name', 'teamName', 'team_name'], 'Команда'),
  };
}

export function normalizeProject(value: unknown): Project {
  const record = asRecord(value);
  const fallbackStatus =
    record.submittedAt || record.submitted_at ? 'submitted' : 'draft';

  return {
    customDirectionName: nullableText(record, [
      'customDirectionName',
      'custom_direction_name',
      'customDirection',
    ]),
    directionId: nullableText(record, ['directionId', 'direction_id']),
    directionName: nullableText(record, [
      'directionName',
      'direction_name',
      'direction',
    ]),
    githubUrl: nullableText(record, ['githubUrl', 'github_url', 'github_link']),
    id: text(record, ['id', 'projectId', 'project_id']),
    mvpUrl: nullableText(record, ['mvpUrl', 'mvp_url', 'mvp_link']),
    presentationUrl: text(record, [
      'presentationUrl',
      'presentation_url',
      'presentation_link',
    ]),
    problem: text(record, ['problem']),
    shortDescription: text(record, [
      'shortDescription',
      'short_description',
      'description',
    ]),
    solution: text(record, ['solution']),
    status: normalizeStatus(text(record, ['status'], fallbackStatus)),
    submittedAt: nullableText(record, ['submittedAt', 'submitted_at']),
    targetAudience: text(record, ['targetAudience', 'target_audience']),
    title: text(record, ['title', 'projectTitle', 'project_title'], 'Проект'),
    youtubeUrl: nullableText(record, ['youtubeUrl', 'youtube_url', 'video_link']),
  };
}

export function normalizeAdminProject(value: unknown): AdminProject {
  const record = asRecord(value);
  const project = normalizeProject(value);
  const totalScore = numberValue(
    record,
    ['totalScore', 'total_score', 'totalWeighted'],
    NaN,
  );

  return {
    ...project,
    course: numberValue(record, ['course'], 0) || null,
    jury: asArray(record.jury ?? record.assignedJury ?? record.assigned_jury).map(
      (item) => text(asRecord(item), ['fullName', 'full_name', 'name'], String(item)),
    ),
    scoresCount: numberValue(record, ['scoresCount', 'scores_count', 'jury_count']),
    teamId: nullableText(record, ['teamId', 'team_id']),
    teamMembers: asArray(record.teamMembers ?? record.team_members).map(
      normalizeTeamMember,
    ),
    teamName: text(record, ['teamName', 'team_name'], 'Команда'),
    totalScore: Number.isFinite(totalScore) ? totalScore : null,
  };
}

export function normalizeJuryProject(value: unknown): JuryProject {
  const record = asRecord(value);
  const status = text(record, [
    'myScoreStatus',
    'my_score_status',
    'scoreStatus',
    'score_status',
  ]);

  return {
    ...normalizeProject(value),
    myScoreStatus:
      status === 'draft' || status === 'submitted' ? status : 'not_started',
    teamMembers: asArray(record.teamMembers ?? record.team_members).map(
      normalizeTeamMember,
    ),
    teamName: text(record, ['teamName', 'team_name'], 'Команда'),
  };
}

export function normalizeDirection(value: unknown): Direction {
  const record = asRecord(value);

  return {
    id: text(record, ['id', 'directionId', 'direction_id', 'name']),
    name: text(record, ['name', 'title'], 'Направление'),
  };
}

export function normalizeCriterion(value: unknown): Criterion {
  const record = asRecord(value);

  return {
    description: nullableText(record, ['description']),
    id: text(record, ['id', 'criterionId', 'criterion_id']),
    isActive: booleanValue(record, ['isActive', 'is_active'], true),
    isRequired: booleanValue(record, ['isRequired', 'is_required'], true),
    maxScore: numberValue(record, ['maxScore', 'max_score'], 10),
    order: numberValue(record, ['order', 'sort_order']),
    title: text(record, ['title', 'name'], 'Критерий'),
    weight: numberValue(record, ['weight'], 1),
  };
}

export function normalizeScoreItem(value: unknown): ScoreItem {
  const record = asRecord(value);

  return {
    comment: nullableText(record, ['comment']),
    criterionId: text(record, ['criterionId', 'criterion_id', 'criteria_id']),
    value: numberValue(record, ['value', 'score'], NaN),
  };
}

export function normalizeScore(value: unknown): Score {
  const record = asRecord(value);
  const items = asArray(record.items).map(normalizeScoreItem);
  const flatCriterionId = text(record, [
    'criterionId',
    'criterion_id',
    'criteria_id',
  ]);

  return {
    id: text(record, ['id', 'scoreId', 'score_id']),
    items: items.length
      ? items
      : flatCriterionId
        ? [normalizeScoreItem(value)]
        : [],
    projectId: text(record, ['projectId', 'project_id']),
    status: text(record, ['status'], 'draft') === 'submitted' ? 'submitted' : 'draft',
    totalRaw: numberValue(record, ['totalRaw', 'total_raw'], 0),
    totalWeighted: numberValue(record, ['totalWeighted', 'total_weighted'], 0),
  };
}

export function normalizeResultRow(value: unknown, index: number): ResultRow {
  const record = asRecord(value);

  return {
    directionName: nullableText(record, [
      'directionName',
      'direction_name',
      'direction',
    ]),
    place: numberValue(record, ['place'], index + 1),
    projectTitle: text(record, ['projectTitle', 'project_title', 'title'], 'Проект'),
    scoresCount: numberValue(record, ['scoresCount', 'scores_count', 'jury_count']),
    teamName: text(record, ['teamName', 'team_name'], 'Команда'),
    totalScore: numberValue(record, ['totalScore', 'total_score'], 0),
  };
}
