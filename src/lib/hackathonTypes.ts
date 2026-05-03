export type EntityId = string | number;

export type Role = 'admin' | 'leader' | 'jury';

export type AppUser = {
  id: EntityId;
  full_name: string;
  login: string;
  role: Role;
  phone: string | null;
  telegram: string | null;
  created_at: string | null;
};

export type Team = {
  id: EntityId;
  team_name: string;
  group_name: string | null;
  external_place: string | null;
  leader_id: EntityId | null;
  created_at: string | null;
};

export type TeamMember = {
  id: EntityId;
  team_id: EntityId;
  full_name: string;
  created_at: string | null;
};

export type Project = {
  id: EntityId;
  team_id: EntityId;
  title: string;
  direction: string | null;
  short_description: string | null;
  full_description: string | null;
  problem: string | null;
  solution: string | null;
  target_audience: string | null;
  mvp_link: string | null;
  presentation_link: string | null;
  github_link: string | null;
  video_link: string | null;
  is_archived: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

export type Criterion = {
  id: EntityId;
  name: string;
  description: string | null;
  max_score: number;
  weight: number;
  is_active: boolean;
  created_at: string | null;
};

export type Score = {
  id: EntityId;
  project_id: EntityId;
  jury_id: EntityId;
  criteria_id: EntityId;
  score: number;
  comment: string | null;
  created_at: string | null;
};

export type Nomination = {
  id: EntityId;
  name: string;
  description: string | null;
  created_at: string | null;
};

export type Winner = {
  id: EntityId;
  nomination_id: EntityId;
  project_id: EntityId;
  created_at: string | null;
};

export type ProjectResult = {
  project_id: EntityId;
  project_title: string;
  direction: string | null;
  team_name: string;
  short_description: string | null;
  total_score: number | null;
  jury_count: number | null;
};

export type Analytics = {
  total_teams: number;
  total_members: number;
  total_projects: number;
  total_jury_voted: number;
};

export type AdminData = {
  analytics: Analytics;
  users: AppUser[];
  teams: Team[];
  members: TeamMember[];
  projects: Project[];
  criteria: Criterion[];
  scores: Score[];
  nominations: Nomination[];
  winners: Winner[];
  results: ProjectResult[];
};

export type ParticipantWorkspace = {
  team: Team | null;
  members: TeamMember[];
  project: Project | null;
};

export type JuryWorkspace = {
  projects: Project[];
  teams: Team[];
  criteria: Criterion[];
  scores: Score[];
};
