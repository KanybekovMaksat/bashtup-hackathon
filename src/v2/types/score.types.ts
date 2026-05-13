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

export type AdminScoreItem = {
  criterionId: string;
  criterionTitle: string | null;
  value: number;
  maxScore: number | null;
  comment?: string | null;
};

export type AdminJuryScore = {
  judgeId: string;
  judgeName: string | null;
  items: AdminScoreItem[];
  totalWeighted: number;
  status: 'draft' | 'submitted';
};
