import { Prisma } from '@prisma/client';

export const taskRelations = {
  project: {
    select: {
      id: true,
      name: true,
      key: true,
    },
  },

  column: {
    select: {
      id: true,
      name: true,
      position: true,
    },
  },

  reporter: {
    select: {
      id: true,
      email: true,
    },
  },

  assignee: {
    select: {
      id: true,
      email: true,
    },
  },

  labels: {
    select: {
      label: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      label: {
        name: 'asc',
      },
    },
  },
} satisfies Prisma.TaskInclude;

export type TaskWithRelations = Prisma.TaskGetPayload<{
  include: typeof taskRelations;
}>;

export function mapTask(task: TaskWithRelations) {
  return {
    ...task,

    labels: task.labels.map((taskLabel) => taskLabel.label),

    issueKey:
      task.project && task.issueNumber
        ? `${task.project.key}-${task.issueNumber}`
        : null,
  };
}
