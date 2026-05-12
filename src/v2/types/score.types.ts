export type Criterion = {
  id: string;
  title: string;
  description?: string | null;
  maxScore: number;
  weight: number;
  order: number;
  isRequired: boolean;
  isActive: boolean;
};

export type ScoreItem = {
  criterionId: string;
  value: number;
  comment?: string | null;
};

export type Score = {
  id: string;
  projectId: string;
  items: ScoreItem[];
  totalRaw?: number;
  totalWeighted?: number;
  status: 'draft' | 'submitted';
};

export type ScorePayload = {
  items: ScoreItem[];
};
