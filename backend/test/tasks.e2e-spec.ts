import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createE2EApp } from './setup-e2e';

describe('Tasks e2e', () => {
  let app: INestApplication;

  let accessToken: string;
  let projectId: number;
  let columnId: number;
  let secondColumnId: number;
  let taskId: number;

  const email = `tasks-e2e-${Date.now()}@example.com`;
  const password = 'Password123!';

  beforeAll(async () => {
    app = await createE2EApp();

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        password,
      })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email,
        password,
      })
      .expect(201);

    accessToken = loginResponse.body.accessToken;

    const projectResponse = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Tasks E2E Project',
        key: `TE${Date.now().toString().slice(-6)}`,
        description: 'Project for tasks e2e tests',
      })
      .expect(201);

    projectId = projectResponse.body.id;

    const boardResponse = await request(app.getHttpServer())
      .post('/boards')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Tasks E2E Board',
        projectId,
      })
      .expect(201);

    expect(boardResponse.body.columns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Backlog',
        }),
        expect.objectContaining({
          name: 'To Do',
        }),
        expect.objectContaining({
          name: 'In Progress',
        }),
        expect.objectContaining({
          name: 'Done',
        }),
      ]),
    );

    columnId = boardResponse.body.columns.find(
      (column: { name: string; id: number }) => column.name === 'To Do',
    ).id;

    secondColumnId = boardResponse.body.columns.find(
      (column: { name: string; id: number }) => column.name === 'In Progress',
    ).id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create a task', async () => {
    const response = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Implement E2E task',
        description: 'Task created through the e2e test',
        projectId,
        columnId,
        priority: 'HIGH',
        issueType: 'TASK',
      })
      .expect(201);

    taskId = response.body.id;

    expect(response.body).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        title: 'Implement E2E task',
        description: 'Task created through the e2e test',
        projectId,
        columnId,
        priority: 'HIGH',
        issueType: 'TASK',
        issueNumber: expect.any(Number),
        issueKey: expect.any(String),
      }),
    );
  });

  it('should return the created task by id', async () => {
    const response = await request(app.getHttpServer())
      .get(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: taskId,
        title: 'Implement E2E task',
        projectId,
        columnId,
      }),
    );
  });

  it('should update the task', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Updated E2E task',
        priority: 'MEDIUM',
        description: 'Updated description',
      })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: taskId,
        title: 'Updated E2E task',
        priority: 'MEDIUM',
        description: 'Updated description',
      }),
    );
  });

  it('should move the task to another column', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/tasks/${taskId}/move`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        columnId: secondColumnId,
        position: 1000,
      })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: taskId,
        columnId: secondColumnId,
        position: 1000,
      }),
    );
  });

  it('should return the task in the task list', async () => {
    const response = await request(app.getHttpServer())
      .get('/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: taskId,
          title: 'Updated E2E task',
          columnId: secondColumnId,
        }),
      ]),
    );
  });

  it('should reject task access without authentication', async () => {
    await request(app.getHttpServer()).get(`/tasks/${taskId}`).expect(401);
  });

  it('should reject creation with invalid task data', async () => {
    await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: '',
        projectId,
        columnId,
      })
      .expect(400);
  });

  it('should reject moving the task to a nonexistent column', async () => {
    await request(app.getHttpServer())
      .patch(`/tasks/${taskId}/move`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        columnId: 999999,
        position: 1000,
      })
      .expect(404);
  });
});
