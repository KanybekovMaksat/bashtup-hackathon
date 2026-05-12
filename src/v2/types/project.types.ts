export type TeamMember = {
  fullName: string;
  course: number;
  group?: string | null;
  roleInTeam?: string | null;
  contact?: string | null;
};

export type Team = {
  id: string;
  name: string;
  members: TeamMember[];
};

export type ProjectStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'evaluated'
  | 'rejected'
  | 'published';

export type Project = {
  id: string;
  title: string;
  directionId?: string | null;
  directionName?: string | null;
  customDirectionName?: string | null;
  shortDescription: string;
  problem: string;
  solution: string;
  targetAudience: string;
  mvpUrl?: string | null;
  presentationUrl: string;
  githubUrl?: string | null;
  youtubeUrl?: string | null;
  status: ProjectStatus;
  submittedAt?: string | null;
};

export type AdminProject = Project & {
  teamId?: string | null;
  teamName: string;
  teamMembers?: TeamMember[];
  course?: number | null;
  jury?: string[];
  scoresCount?: number;
  totalScore?: number | null;
};

export type JuryProject = Project & {
  teamName: string;
  teamMembers?: TeamMember[];
  myScoreStatus: 'not_started' | 'draft' | 'submitted';
};

export type Direction = {
  id: string;
  name: string;
};

export type ProjectFormPayload = Omit<Project, 'id' | 'status' | 'submittedAt'>;
