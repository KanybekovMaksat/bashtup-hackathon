import { Button, Card, Chip } from '@heroui/react';
import type { Project, Team } from '../lib/hackathonTypes';

type ProjectPreviewCardProps = {
  project: Project | null;
  team: Team | null;
};

const projectLinks = [
  ['mvp_link', 'MVP'],
  ['presentation_link', 'Презентация'],
  ['github_link', 'GitHub'],
  ['video_link', 'Видео'],
] as const;

export function ProjectPreviewCard({ project, team }: ProjectPreviewCardProps) {
  if (!project) {
    return (
      <Card className="dashboard-state">
        <Card.Content>
          Проект ещё не заполнен. После сохранения здесь появится карточка.
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card className="project-preview-card">
      <Card.Header>
        <div>
          <Card.Title>{project.title}</Card.Title>
          <Card.Description>{team?.team_name ?? 'Моя команда'}</Card.Description>
        </div>
        {project.direction && (
          <Chip color="accent" variant="soft">
            {project.direction}
          </Chip>
        )}
      </Card.Header>
      <Card.Content>
        <p className="project-preview-lead">{project.short_description}</p>
        <div className="preview-grid">
          <div>
            <span>Проблема</span>
            <p>{project.problem || 'Не заполнено'}</p>
          </div>
          <div>
            <span>Решение</span>
            <p>{project.solution || 'Не заполнено'}</p>
          </div>
          <div>
            <span>Аудитория</span>
            <p>{project.target_audience || 'Не заполнено'}</p>
          </div>
        </div>
      </Card.Content>
      <Card.Footer>
        {projectLinks.map(([field, label]) => {
          const href = project[field];

          if (!href) {
            return null;
          }

          return (
            <Button
              key={field}
              onPress={() => window.open(href, '_blank', 'noreferrer')}
              variant="outline"
            >
              {label}
            </Button>
          );
        })}
      </Card.Footer>
    </Card>
  );
}
