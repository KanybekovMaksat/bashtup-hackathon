export type AdminDashboardStats = {
  totalProjects: number;
  submittedProjects: number;
  draftProjects: number;
  participants: number;
  jury: number;
  evaluationProgress: number;
};

export type ResultRow = {
  place: number;
  teamName: string;
  projectTitle: string;
  directionName?: string | null;
  totalScore: number;
  scoresCount: number;
};

export type Nomination = {
  id: string;
  title: string;
  description?: string | null;
  winnerProjectId?: string | null;
};

export type Analytics = {
  totalProjects: number;
  submittedProjects: number;
  draftProjects: number;
  projectsByDirection: Array<{ name: string; count: number }>;
  projectsByCourse: Array<{ name: string; count: number }>;
  juryProgress: Array<{ name: string; assigned: number; evaluated: number }>;
  evaluatedProjects: number;
  notEvaluatedProjects: number;
};

export type TeamResults = {
  published: boolean;
  place?: number | null;
  nominations?: string[];
  publicTotal?: number | null;
};
