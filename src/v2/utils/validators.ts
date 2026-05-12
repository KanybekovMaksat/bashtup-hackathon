import type { Criterion, ProjectFormPayload, ScoreItem, Team } from '../types';

export type FieldErrors = Record<string, string>;

export function isValidUrl(value: string) {
  if (!value.trim()) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validatePasswordChange(
  oldPassword: string,
  newPassword: string,
  repeatPassword: string,
) {
  const errors: FieldErrors = {};

  if (!oldPassword.trim()) {
    errors.oldPassword = 'Введите старый пароль';
  }

  if (!newPassword.trim()) {
    errors.newPassword = 'Введите новый пароль';
  } else if (newPassword.length < 8) {
    errors.newPassword = 'Минимальная длина пароля - 8 символов';
  }

  if (repeatPassword !== newPassword) {
    errors.repeatPassword = 'Пароли должны совпадать';
  }

  return errors;
}

export function validateTeam(team: Team) {
  const errors: FieldErrors = {};

  if (!team.name.trim()) {
    errors.name = 'Введите название команды';
  }

  if (team.members.length < 1) {
    errors.members = 'Добавьте минимум одного участника';
  }

  team.members.forEach((member, index) => {
    if (!member.fullName.trim()) {
      errors[`members.${index}.fullName`] = 'Введите ФИО участника';
    }

    if (!member.course) {
      errors[`members.${index}.course`] = 'Укажите курс';
    }
  });

  return errors;
}

export function validateProject(project: ProjectFormPayload) {
  const errors: FieldErrors = {};

  if (!project.title.trim()) {
    errors.title = 'Введите название проекта';
  }

  if (!project.directionId && !project.customDirectionName?.trim()) {
    errors.direction = 'Выберите направление или введите свое';
  }

  if (!project.shortDescription.trim()) {
    errors.shortDescription = 'Добавьте краткое описание';
  }

  if (!project.problem.trim()) {
    errors.problem = 'Опишите проблему';
  }

  if (!project.solution.trim()) {
    errors.solution = 'Опишите решение';
  }

  if (!project.targetAudience.trim()) {
    errors.targetAudience = 'Укажите целевую аудиторию';
  }

  if (!project.presentationUrl.trim()) {
    errors.presentationUrl = 'Добавьте ссылку на презентацию';
  }

  const urlFields: Array<[string, string | null | undefined]> = [
    ['mvpUrl', project.mvpUrl],
    ['presentationUrl', project.presentationUrl],
    ['githubUrl', project.githubUrl],
    ['youtubeUrl', project.youtubeUrl],
  ];

  urlFields.forEach(([field, value]) => {
    if (typeof value === 'string' && !isValidUrl(value)) {
      errors[field] = 'Введите корректную ссылку';
    }
  });

  return errors;
}

export function validateScore(criteria: Criterion[], items: ScoreItem[]) {
  const errors: FieldErrors = {};
  const itemByCriterion = new Map(items.map((item) => [item.criterionId, item]));

  criteria.forEach((criterion) => {
    const item = itemByCriterion.get(criterion.id);
    const value = item?.value;

    if (criterion.isRequired && (value === undefined || Number.isNaN(value))) {
      errors[criterion.id] = 'Обязательный критерий';
      return;
    }

    if (value === undefined || Number.isNaN(value)) {
      return;
    }

    if (value < 0) {
      errors[criterion.id] = 'Балл не может быть меньше 0';
    }

    if (value > criterion.maxScore) {
      errors[criterion.id] = `Максимум ${criterion.maxScore}`;
    }
  });

  return errors;
}

export function hasErrors(errors: FieldErrors) {
  return Object.keys(errors).length > 0;
}
