import { mapTask } from './task.mapper';

describe('mapTask', () => {
  it('should flatten task labels and generate issue key', () => {
    const task = {
      id: 1,
      title: 'Implement API',
      project: {
        id: 10,
        name: 'Task Tracker',
        key: 'TT',
      },
      column: {
        id: 20,
        name: 'In Progress',
        position: 2000,
      },
      reporter: {
        id: 1,
        email: 'reporter@example.com',
      },
      assignee: {
        id: 2,
        email: 'assignee@example.com',
      },
      labels: [
        {
          label: {
            id: 100,
            name: 'Backend',
          },
        },
        {
          label: {
            id: 101,
            name: 'Urgent',
          },
        },
      ],
      issueNumber: 25,
    };

    const result = mapTask(task as never);

    expect(result).toEqual({
      ...task,
      labels: [
        {
          id: 100,
          name: 'Backend',
        },
        {
          id: 101,
          name: 'Urgent',
        },
      ],
      issueKey: 'TT-25',
    });
  });

  it('should return null issueKey when task has no project', () => {
    const task = {
      id: 1,
      title: 'Standalone task',
      project: null,
      column: null,
      reporter: {
        id: 1,
        email: 'reporter@example.com',
      },
      assignee: null,
      labels: [],
      issueNumber: 25,
    };

    const result = mapTask(task as never);

    expect(result.issueKey).toBeNull();
    expect(result.labels).toEqual([]);
  });

  it('should return null issueKey when task has no issue number', () => {
    const task = {
      id: 1,
      title: 'Task without issue number',
      project: {
        id: 10,
        name: 'Task Tracker',
        key: 'TT',
      },
      column: null,
      reporter: {
        id: 1,
        email: 'reporter@example.com',
      },
      assignee: null,
      labels: [],
      issueNumber: null,
    };

    const result = mapTask(task as never);

    expect(result.issueKey).toBeNull();
  });

  it('should return an empty labels array when task has no labels', () => {
    const task = {
      id: 1,
      title: 'Task',
      project: {
        id: 10,
        name: 'Task Tracker',
        key: 'TT',
      },
      column: null,
      reporter: {
        id: 1,
        email: 'reporter@example.com',
      },
      assignee: null,
      labels: [],
      issueNumber: 10,
    };

    const result = mapTask(task as never);

    expect(result.labels).toEqual([]);
    expect(result.issueKey).toBe('TT-10');
  });

  it('should preserve the original task fields', () => {
    const task = {
      id: 1,
      title: 'Task',
      description: 'Description',
      priority: 'HIGH',
      project: {
        id: 10,
        name: 'Task Tracker',
        key: 'TT',
      },
      column: {
        id: 20,
        name: 'Done',
        position: 4000,
      },
      reporter: {
        id: 1,
        email: 'reporter@example.com',
      },
      assignee: null,
      labels: [
        {
          label: {
            id: 100,
            name: 'Backend',
          },
        },
      ],
      issueNumber: 10,
    };

    const result = mapTask(task as never);

    expect(result.id).toBe(task.id);
    expect(result.title).toBe(task.title);
    expect(result.description).toBe(task.description);
    expect(result.priority).toBe(task.priority);
    expect(result.project).toEqual(task.project);
    expect(result.column).toEqual(task.column);
    expect(result.reporter).toEqual(task.reporter);
    expect(result.assignee).toEqual(task.assignee);
  });
});
