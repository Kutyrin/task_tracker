import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createE2EApp } from './setup-e2e';

describe('Comments and Labels e2e', () => {
  let app: INestApplication;

  let accessToken: string;
  let projectId: number;
  let columnId: number;
  let taskId: number;
  let labelId: number;
  let commentId: number;

  const email = `comments-labels-e2e-${Date.now()}@example.com`;
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
        name: 'Comments Labels E2E Project',
        key: `CL${Date.now().toString().slice(-6)}`,
        description: 'Project for comments and labels e2e tests',
      })
      .expect(201);

    projectId = projectResponse.body.id;

    const boardResponse = await request(app.getHttpServer())
      .post('/boards')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Comments Labels E2E Board',
        projectId,
      })
      .expect(201);

    columnId = boardResponse.body.columns.find(
      (column: { name: string; id: number }) => column.name === 'To Do',
    ).id;

    const taskResponse = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Comments and Labels E2E Task',
        description: 'Task for comments and labels tests',
        projectId,
        columnId,
        priority: 'MEDIUM',
        issueType: 'TASK',
      })
      .expect(201);

    taskId = taskResponse.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('labels', () => {
    it('should create a project label', async () => {
      const response = await request(app.getHttpServer())
        .post(`/projects/${projectId}/labels`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Backend',
        })
        .expect(201);

      labelId = response.body.id;

      expect(response.body).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          name: 'Backend',
          projectId,
        }),
      );
    });

    it('should return project labels', async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${projectId}/labels`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: labelId,
            name: 'Backend',
            projectId,
          }),
        ]),
      );
    });

    it('should assign the label to the task', async () => {
      const response = await request(app.getHttpServer())
        .post(`/tasks/${taskId}/labels`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          labelId,
        })
        .expect(201);

      expect(response.body).toEqual({
        message: 'Label assigned successfully',
      });
    });

    it('should return labels assigned to the task', async () => {
      const response = await request(app.getHttpServer())
        .get(`/tasks/${taskId}/labels`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: labelId,
            name: 'Backend',
            projectId,
          }),
        ]),
      );
    });

    it('should reject assigning the same label twice', async () => {
      await request(app.getHttpServer())
        .post(`/tasks/${taskId}/labels`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          labelId,
        })
        .expect(409);
    });

    it('should update the project label', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/projects/${projectId}/labels/${labelId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'API',
        })
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: labelId,
          name: 'API',
          projectId,
        }),
      );
    });

    it('should remove the label from the task', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/tasks/${taskId}/labels/${labelId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Label removed successfully',
      });
    });

    it('should return no labels after removing the label from the task', async () => {
      const response = await request(app.getHttpServer())
        .get(`/tasks/${taskId}/labels`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: labelId,
          }),
        ]),
      );
    });

    it('should remove the project label', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/projects/${projectId}/labels/${labelId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Label deleted successfully',
      });
    });
  });

  describe('comments', () => {
    it('should create a comment', async () => {
      const response = await request(app.getHttpServer())
        .post(`/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          content: 'First E2E comment',
        })
        .expect(201);

      commentId = response.body.id;

      expect(response.body).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          content: 'First E2E comment',
          taskId,
          user: {
            id: expect.any(Number),
            email,
          },
        }),
      );
    });

    it('should return task comments', async () => {
      const response = await request(app.getHttpServer())
        .get(`/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: commentId,
            content: 'First E2E comment',
            taskId,
          }),
        ]),
      );
    });

    it('should update the comment', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/tasks/${taskId}/comments/${commentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          content: 'Updated E2E comment',
        })
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: commentId,
          content: 'Updated E2E comment',
          taskId,
        }),
      );
    });

    it('should reject empty comment content', async () => {
      await request(app.getHttpServer())
        .post(`/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          content: '',
        })
        .expect(400);
    });

    it('should delete the comment', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/tasks/${taskId}/comments/${commentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Comment deleted successfully',
      });
    });

    it('should return no comments after deleting the comment', async () => {
      const response = await request(app.getHttpServer())
        .get(`/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: commentId,
          }),
        ]),
      );
    });
  });
});
