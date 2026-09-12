import { INestApplication } from '@nestjs/common';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import request from 'supertest';

import { createE2EApp } from './setup-e2e';

describe('Attachments e2e', () => {
  let app: INestApplication | undefined;

  let accessToken: string;
  let taskId: number;
  let attachmentId: number;

  const email = `attachments-e2e-${Date.now()}@example.com`;
  const password = 'Password123!';

  const fixturePath = join(
    process.cwd(),
    'test',
    'fixtures',
    'e2e-attachment.txt',
  );

  beforeAll(async () => {
    await mkdir(dirname(fixturePath), { recursive: true });
    await writeFile(fixturePath, 'E2E attachment test');

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
        name: 'Attachments E2E Project',
        key: `AT${Date.now().toString().slice(-6)}`,
        description: 'Project for attachments e2e tests',
      })
      .expect(201);

    const projectId = projectResponse.body.id;

    const boardResponse = await request(app.getHttpServer())
      .post('/boards')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Attachments E2E Board',
        projectId,
      })
      .expect(201);

    const columnId = boardResponse.body.columns.find(
      (column: { id: number; name: string }) => column.name === 'To Do',
    ).id;

    const taskResponse = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Attachments E2E Task',
        description: 'Task for attachment e2e tests',
        projectId,
        columnId,
        priority: 'MEDIUM',
        issueType: 'TASK',
      })
      .expect(201);

    taskId = taskResponse.body.id;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }

    try {
      await unlink(fixturePath);
    } catch {
      // Ignore cleanup errors for the test fixture.
    }
  });

  it('should reject attachment list access without authentication', async () => {
    await request(app!.getHttpServer())
      .get(`/tasks/${taskId}/attachments`)
      .expect(401);
  });

  it('should return an empty attachment list for a task', async () => {
    const response = await request(app!.getHttpServer())
      .get(`/tasks/${taskId}/attachments`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toEqual({
      data: [],
    });
  });

  it('should reject an unsupported file type', async () => {
    const invalidFilePath = join(
      process.cwd(),
      'test',
      'fixtures',
      'e2e-invalid.exe',
    );

    await writeFile(invalidFilePath, 'invalid file');

    try {
      await request(app!.getHttpServer())
        .post(`/tasks/${taskId}/attachments`)
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', invalidFilePath)
        .expect(400);
    } finally {
      try {
        await unlink(invalidFilePath);
      } catch {
        // Ignore cleanup errors for the temporary invalid file.
      }
    }
  });

  it('should upload an attachment', async () => {
    const response = await request(app!.getHttpServer())
      .post(`/tasks/${taskId}/attachments`)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', fixturePath)
      .expect(201);

    attachmentId = response.body.id;

    expect(response.body).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        filename: 'e2e-attachment.txt',
        mimeType: 'text/plain',
        size: expect.any(Number),
        url: expect.stringMatching(/^\/uploads\//),
        user: {
          id: expect.any(Number),
          email,
        },
      }),
    );
  });

  it('should return the uploaded attachment', async () => {
    const response = await request(app!.getHttpServer())
      .get(`/tasks/${taskId}/attachments`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: attachmentId,
          filename: 'e2e-attachment.txt',
          mimeType: 'text/plain',
          user: expect.objectContaining({
            email,
          }),
        }),
      ]),
    );
  });

  it('should reject deleting a nonexistent attachment', async () => {
    await request(app!.getHttpServer())
      .delete(`/tasks/${taskId}/attachments/999999`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });

  it('should delete the attachment', async () => {
    const response = await request(app!.getHttpServer())
      .delete(`/tasks/${taskId}/attachments/${attachmentId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toEqual({
      message: 'Attachment deleted successfully',
    });
  });

  it('should return no attachments after deletion', async () => {
    const response = await request(app!.getHttpServer())
      .get(`/tasks/${taskId}/attachments`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.data).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: attachmentId,
        }),
      ]),
    );
  });
});
