import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createE2EApp } from './setup-e2e';

describe('Projects e2e', () => {
  let app: INestApplication;

  let ownerToken: string;
  let memberToken: string;

  let ownerId: number;
  let memberId: number;
  let projectId: number;

  const ownerEmail = `project-owner-${Date.now()}@example.com`;
  const memberEmail = `project-member-${Date.now()}@example.com`;
  const password = 'Password123!';

  beforeAll(async () => {
    app = await createE2EApp();

    const ownerRegister = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: ownerEmail,
        password,
      })
      .expect(201);

    ownerId = ownerRegister.body.id;

    const memberRegister = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: memberEmail,
        password,
      })
      .expect(201);

    memberId = memberRegister.body.id;

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create a project', async () => {
    const response = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'E2E Project',
        key: `EP${Date.now().toString().slice(-6)}`,
        description: 'Project created by e2e test',
      })
      .expect(201);

    projectId = response.body.id;

    expect(response.body).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        name: 'E2E Project',
        key: expect.any(String),
        ownerId,
      }),
    );
  });

  it('should return projects available to the authenticated user', async () => {
    const response = await request(app.getHttpServer())
      .get('/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: projectId,
          name: 'E2E Project',
          role: 'OWNER',
        }),
      ]),
    );
  });

  it('should return a project by id', async () => {
    const response = await request(app.getHttpServer())
      .get(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: projectId,
        name: 'E2E Project',
        ownerId,
        role: 'OWNER',
      }),
    );
  });

  it('should update the project as owner', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Updated E2E Project',
      })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: projectId,
        name: 'Updated E2E Project',
      }),
    );
  });

  it('should reject project access without authentication', async () => {
    await request(app.getHttpServer())
      .get(`/projects/${projectId}`)
      .expect(401);
  });

  it('should add a member to the project', async () => {
    const response = await request(app.getHttpServer())
      .post(`/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        userId: memberId,
        role: 'MEMBER',
      })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        role: 'MEMBER',
        user: {
          id: memberId,
          email: memberEmail,
        },
      }),
    );
  });

  it('should return project members', async () => {
    const response = await request(app.getHttpServer())
      .get(`/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          user: {
            id: ownerId,
            email: ownerEmail,
          },
          role: 'OWNER',
        }),
        expect.objectContaining({
          user: {
            id: memberId,
            email: memberEmail,
          },
          role: 'MEMBER',
        }),
      ]),
    );
  });

  it('should allow the member to access the project after being added', async () => {
    const response = await request(app.getHttpServer())
      .get(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: projectId,
        role: 'MEMBER',
      }),
    );
  });

  it('should allow the owner to promote the member to ADMIN', async () => {
    const membersResponse = await request(app.getHttpServer())
      .get(`/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const member = membersResponse.body.find(
      (item: {
        user: {
          id: number;
        };
      }) => item.user.id === memberId,
    );

    expect(member).toBeDefined();

    const response = await request(app.getHttpServer())
      .patch(`/projects/${projectId}/members/${member.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        role: 'ADMIN',
      })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: member.id,
        role: 'ADMIN',
        user: {
          id: memberId,
          email: memberEmail,
        },
      }),
    );
  });

  it('should return project statistics', async () => {
    const response = await request(app.getHttpServer())
      .get(`/projects/${projectId}/stats`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        total: expect.any(Number),
        overdue: expect.any(Number),
        byPriority: expect.any(Array),
        byIssueType: expect.any(Array),
        byColumn: expect.any(Array),
        byAssignee: expect.any(Array),
      }),
    );
  });
});
