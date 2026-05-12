import { apiRequest } from './apiClient';
import {
  asArray,
  asRecord,
  normalizeDirection,
  normalizeProject,
  normalizeTeam,
  numberValue,
  pickData,
  text,
} from './normalizers';
import type {
  Direction,
  Project,
  ProjectFormPayload,
  Team,
  TeamResults,
} from '../types';

const fallbackDirections: Direction[] = [
  { id: 'technology', name: 'Технологии и разработка' },
  { id: 'education', name: 'Образование и общество' },
  { id: 'services', name: 'Среда и сервисы' },
];

function normalizeTeamResults(value: unknown): TeamResults {
  const record = asRecord(pickData(value, ['results']));

  return {
    nominations: asArray(record.nominations).map((item) => String(item)),
    place: numberValue(record, ['place'], 0) || null,
    publicTotal: numberValue(record, ['publicTotal', 'public_total', 'total'], 0) || null,
    published: Boolean(record.published ?? record.isPublished ?? record.is_published),
  };
}

export async function fetchTeam() {
  const response = await apiRequest<unknown>('/participant/team');
  const record = asRecord(response);

  return normalizeTeam(record.team ?? record.data ?? response);
}

export async function saveTeam(team: Team) {
  const response = await apiRequest<unknown>('/participant/team', {
    body: team,
    method: 'PUT',
  });
  const record = asRecord(response);

  return normalizeTeam(record.team ?? record.data ?? response);
}

export async function fetchParticipantProject(): Promise<Project | null> {
  const response = await apiRequest<unknown>('/participant/project');
  const record = asRecord(response);
  const projectPayload = record.project ?? record.data ?? response;

  return projectPayload ? normalizeProject(projectPayload) : null;
}

export async function saveParticipantProject(payload: ProjectFormPayload) {
  const response = await apiRequest<unknown>('/participant/project', {
    body: payload,
    method: 'PUT',
  });
  const record = asRecord(response);

  return normalizeProject(record.project ?? record.data ?? response);
}

export async function submitParticipantProject() {
  const response = await apiRequest<unknown>('/participant/project/submit', {
    method: 'POST',
  });
  const record = asRecord(response);

  return normalizeProject(record.project ?? record.data ?? response);
}

export async function fetchTeamResults() {
  const response = await apiRequest<unknown>('/participant/results');
  return normalizeTeamResults(response);
}

export async function fetchParticipantDirections() {
  try {
    const response = await apiRequest<unknown>('/participant/directions');
    const directions = asArray(pickData(response, ['directions'])).map(
      normalizeDirection,
    );

    return directions.length ? directions : fallbackDirections;
  } catch {
    return fallbackDirections;
  }
}

export function createEmptyTeam(): Team {
  return {
    id: '',
    members: [
      {
        contact: '',
        course: 1,
        fullName: '',
        group: '',
        roleInTeam: '',
      },
    ],
    name: '',
  };
}

export function createEmptyProject(): ProjectFormPayload {
  return {
    customDirectionName: '',
    directionId: '',
    directionName: '',
    githubUrl: '',
    mvpUrl: '',
    presentationUrl: '',
    problem: '',
    shortDescription: '',
    solution: '',
    targetAudience: '',
    title: '',
    youtubeUrl: '',
  };
}

export function getProjectDirectionLabel(project: Project | ProjectFormPayload) {
  return (
    project.customDirectionName ||
    project.directionName ||
    text(asRecord(project), ['directionId'], 'Не выбрано')
  );
}
