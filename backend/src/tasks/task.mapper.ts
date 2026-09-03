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
} satisfies Prisma.TaskInclude;

export type TaskWithRelations = Prisma.TaskGetPayload<{
  include: typeof taskRelations;
}>;

export function mapTask(task: TaskWithRelations) {
  return {
    ...task,

    issueKey:
      task.project && task.issueNumber
        ? `${task.project.key}-${task.issueNumber}`
        : null,
  };
}
