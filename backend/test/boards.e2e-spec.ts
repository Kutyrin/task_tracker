import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createE2EApp } from './setup-e2e';

describe('Boards e2e', () => {
  let app: INestApplication;

  let ownerToken: string;
  let memberToken: string;

  let projectId: number;
  let boardId: number;

  let backlogColumnId: number;
  let todoColumnId: number;
  let inProgressColumnId: number;
  let doneColumnId: number;
  let customColumnId: number;
  let protectedColumnId: number;
  let protectedTaskId: number;

  const ownerEmail = `boards-owner-${Date.now()}@example.com`;
  const memberEmail = `boards-member-${Date.now()}@example.com`;
  const password = 'Password123!';

  beforeAll(async () => {
    app = await createE2EApp();

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: ownerEmail,
        password,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: memberEmail,
        password,
      })
      .expect(201);

    const ownerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: ownerEmail,
        password,
      })
      .expect(201);

    ownerToken = ownerLogin.body.accessToken;

    const memberLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: memberEmail,
        password,
      })
      .expect(201);

    memberToken = memberLogin.body.accessToken;

    const projectResponse = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Boards E2E Project',
        key: `BE${Date.now().toString().slice(-6)}`,
        description: 'Project for boards e2e tests',
      })
      .expect(201);

    projectId = projectResponse.body.id;

    const addMemberResponse = await request(app.getHttpServer())
      .post(`/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        email: memberEmail,
        role: 'MEMBER',
      })
      .expect(201);

    expect(addMemberResponse.body).toEqual(
      expect.objectContaining({
        role: 'MEMBER',
        user: expect.objectContaining({
          email: memberEmail,
        }),
      }),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('should reject board access without authentication', async () => {
    await request(app.getHttpServer()).get('/boards').expect(401);
  });

  it('should create a board with default columns', async () => {
    const response = await request(app.getHttpServer())
      .post('/boards')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Boards E2E Board',
        projectId,
      })
      .expect(201);

    boardId = response.body.id;

    expect(response.body).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        name: 'Boards E2E Board',
        projectId,
        ownerId: expect.any(Number),
      }),
    );

    expect(response.body.columns).toHaveLength(4);

    expect(response.body.columns).toEqual([
      expect.objectContaining({
        name: 'Backlog',
        position: 1000,
      }),
      expect.objectContaining({
        name: 'To Do',
        position: 2000,
      }),
      expect.objectContaining({
        name: 'In Progress',
        position: 3000,
      }),
      expect.objectContaining({
        name: 'Done',
        position: 4000,
      }),
    ]);

    backlogColumnId = response.body.columns.find(
      (column: { name: string; id: number }) => column.name === 'Backlog',
    ).id;

    todoColumnId = response.body.columns.find(
      (column: { name: string; id: number }) => column.name === 'To Do',
    ).id;

    inProgressColumnId = response.body.columns.find(
      (column: { name: string; id: number }) => column.name === 'In Progress',
    ).id;

    doneColumnId = response.body.columns.find(
      (column: { name: string; id: number }) => column.name === 'Done',
    ).id;
  });

  it('should return boards available to the authenticated user', async () => {
    const response = await request(app.getHttpServer())
      .get('/boards')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: boardId,
          name: 'Boards E2E Board',
          projectId,
        }),
      ]),
    );
  });

  it('should allow a project member to view boards', async () => {
    const response = await request(app.getHttpServer())
      .get('/boards')
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: boardId,
          name: 'Boards E2E Board',
          projectId,
        }),
      ]),
    );
  });

  it('should return a board with its columns', async () => {
    const response = await request(app.getHttpServer())
      .get(`/boards/${boardId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: boardId,
        name: 'Boards E2E Board',
        projectId,
      }),
    );

    expect(response.body.columns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: backlogColumnId,
          name: 'Backlog',
        }),
        expect.objectContaining({
          id: todoColumnId,
          name: 'To Do',
        }),
        expect.objectContaining({
          id: inProgressColumnId,
          name: 'In Progress',
        }),
        expect.objectContaining({
          id: doneColumnId,
          name: 'Done',
        }),
      ]),
    );
  });

  it('should reject board creation for a project member', async () => {
    await request(app.getHttpServer())
      .post('/boards')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        name: 'Forbidden Board',
        projectId,
      })
      .expect(403);
  });

  it('should create a custom column', async () => {
    const response = await request(app.getHttpServer())
      .post(`/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Review',
      })
      .expect(201);

    customColumnId = response.body.id;

    expect(response.body).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        boardId,
        name: 'Review',
        position: 5000,
      }),
    );
  });

  it('should return board columns with task counts', async () => {
    const response = await request(app.getHttpServer())
      .get(`/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(response.body).toHaveLength(5);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: backlogColumnId,
          name: 'Backlog',
          _count: {
            tasks: 0,
          },
        }),
        expect.objectContaining({
          id: customColumnId,
          name: 'Review',
          _count: {
            tasks: 0,
          },
        }),
      ]),
    );
  });

  it('should allow a project member to view board columns', async () => {
    const response = await request(app.getHttpServer())
      .get(`/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: backlogColumnId,
          name: 'Backlog',
        }),
      ]),
    );
  });

  it('should update the board name', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/boards/${boardId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Updated Boards E2E Board',
      })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: boardId,
        name: 'Updated Boards E2E Board',
      }),
    );
  });

  it('should reject board update for a project member', async () => {
    await request(app.getHttpServer())
      .patch(`/boards/${boardId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        name: 'Forbidden Update',
      })
      .expect(403);
  });

  it('should update a column name', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/boards/${boardId}/columns/${customColumnId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Ready for Review',
      })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: customColumnId,
        boardId,
        name: 'Ready for Review',
      }),
    );
  });

  it('should reject column update for a project member', async () => {
    await request(app.getHttpServer())
      .patch(`/boards/${boardId}/columns/${customColumnId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        name: 'Forbidden Column Update',
      })
      .expect(403);
  });

  it('should move a column', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/boards/${boardId}/columns/${customColumnId}/move`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        position: 2500,
      })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: customColumnId,
        boardId,
        position: 2500,
      }),
    );
  });

  it('should reject column move for a project member', async () => {
    await request(app.getHttpServer())
      .patch(`/boards/${boardId}/columns/${customColumnId}/move`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        position: 3500,
      })
      .expect(403);
  });

  it('should reject invalid board data', async () => {
    await request(app.getHttpServer())
      .post('/boards')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: '',
        projectId,
      })
      .expect(400);
  });

  it('should reject invalid column data', async () => {
    await request(app.getHttpServer())
      .post(`/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: '',
      })
      .expect(400);
  });

  it('should reject deleting a column containing tasks', async () => {
    const columnResponse = await request(app.getHttpServer())
      .post(`/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Protected Column',
      })
      .expect(201);

    protectedColumnId = columnResponse.body.id;

    const taskResponse = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Task protecting the column',
        description: 'This task prevents the column from being deleted',
        projectId,
        columnId: protectedColumnId,
        priority: 'HIGH',
        issueType: 'TASK',
      })
      .expect(201);

    protectedTaskId = taskResponse.body.id;

    await request(app.getHttpServer())
      .delete(`/boards/${boardId}/columns/${protectedColumnId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(409);

    await request(app.getHttpServer())
      .delete(`/tasks/${protectedTaskId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
  });

  it('should delete an empty custom column', async () => {
    await request(app.getHttpServer())
      .delete(`/boards/${boardId}/columns/${customColumnId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200)
      .expect({
        message: 'Column deleted successfully',
      });

    const response = await request(app.getHttpServer())
      .get(`/boards/${boardId}/columns`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(response.body).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: customColumnId,
        }),
      ]),
    );
  });

  it('should delete an empty protected column after its task is removed', async () => {
    await request(app.getHttpServer())
      .delete(`/boards/${boardId}/columns/${protectedColumnId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200)
      .expect({
        message: 'Column deleted successfully',
      });
  });

  it('should reject board access for a nonexistent board', async () => {
    await request(app.getHttpServer())
      .get('/boards/999999')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(404);
  });

  it('should reject access to a nonexistent column', async () => {
    await request(app.getHttpServer())
      .patch(`/boards/${boardId}/columns/999999`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Missing',
      })
      .expect(404);
  });

  it('should reject board deletion for a project member', async () => {
    await request(app.getHttpServer())
      .delete(`/boards/${boardId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(403);
  });

  it('should delete the board', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/boards/${boardId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(response.body).toEqual({
      message: 'Board deleted successfully',
    });

    await request(app.getHttpServer())
      .get(`/boards/${boardId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(404);
  });
});
