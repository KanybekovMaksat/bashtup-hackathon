import { apiRequest } from './apiClient';
import {
  asArray,
  asRecord,
  normalizeCriterion,
  normalizeJuryProject,
  normalizeScore,
  pickData,
} from './normalizers';
import type { Criterion, JuryProject, Score, ScorePayload } from '../types';

export type JuryScoreContext = {
  criteria: Criterion[];
  score: Score | null;
};

export async function fetchJuryProjects() {
  const response = await apiRequest<unknown>('/jury/projects');

  return asArray(pickData(response, ['projects'])).map(normalizeJuryProject);
}

export async function fetchJuryProject(projectId: string): Promise<JuryProject> {
  const response = await apiRequest<unknown>(
    `/jury/projects/${encodeURIComponent(projectId)}`,
  );
  const record = asRecord(response);

  return normalizeJuryProject(record.project ?? record.data ?? response);
}

export async function fetchJuryScore(projectId: string): Promise<JuryScoreContext> {
  const response = await apiRequest<unknown>(
    `/jury/projects/${encodeURIComponent(projectId)}/score`,
  );
  const record = asRecord(response);
  const data = asRecord(record.data ?? response);
  const criteria = asArray(data.criteria).map(normalizeCriterion);
  const scorePayload = data.score ?? record.score ?? null;

  return {
    criteria,
    score: scorePayload ? normalizeScore(scorePayload) : null,
  };
}

export async function saveJuryScore(projectId: string, payload: ScorePayload) {
  const response = await apiRequest<unknown>(
    `/jury/projects/${encodeURIComponent(projectId)}/score`,
    {
      body: payload,
      method: 'PUT',
    },
  );
  const record = asRecord(response);

  return normalizeScore(record.score ?? record.data ?? response);
}

export async function submitJuryScore(projectId: string, payload: ScorePayload) {
  const response = await apiRequest<unknown>(
    `/jury/projects/${encodeURIComponent(projectId)}/score/submit`,
    {
      body: payload,
      method: 'POST',
    },
  );
  const record = asRecord(response);

  return normalizeScore(record.score ?? record.data ?? response);
}
