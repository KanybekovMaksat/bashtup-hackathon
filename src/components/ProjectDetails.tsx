import { Button, Chip } from '@heroui/react';
import type { Project, Team } from '../lib/hackathonTypes';

type ProjectDetailsProps = {
  project: Project;
  team?: Team | null;
};

const linkFields = [
  ['mvp_link', 'MVP'],
  ['presentation_link', 'Презентация'],
  ['github_link', 'GitHub'],
  ['video_link', 'Видео'],
] as const;

function DetailBlock({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="detail-block">
      <span>{label}</span>
      <p>{value || 'Не заполнено'}</p>
    </div>
  );
}

export function ProjectDetails({ project, team }: ProjectDetailsProps) {
  return (
    <div className="project-details">
      <div className="project-details-head">
        <div>
          <h2>{project.title}</h2>
          <p>{team?.team_name ?? 'Команда не найдена'}</p>
        </div>
        {project.direction && (
          <Chip color="accent" variant="soft">
            {project.direction}
          </Chip>
        )}
      </div>

      <DetailBlock
        label="Краткое описание"
        value={project.short_description}
      />
      <DetailBlock label="Полное описание" value={project.full_description} />
      <DetailBlock label="Проблема" value={project.problem} />
      <DetailBlock label="Решение" value={project.solution} />
      <DetailBlock label="Целевая аудитория" value={project.target_audience} />

      <div className="project-links">
        {linkFields.map(([field, label]) => {
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
      </div>
    </div>
  );
}
