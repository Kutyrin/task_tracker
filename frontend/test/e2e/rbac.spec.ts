import { expect, test } from '@playwright/test';
import {
  addMember,
  apiURL,
  createUser,
  createWorkspace,
  headers,
  signIn,
} from './helpers';

test('member can comment but cannot manage project, labels, or another author comment', async ({
  page,
  request,
}) => {
  const owner = await createUser(request);
  const member = await createUser(request);
  const { project, task } = await createWorkspace(request, owner);
  const membership = await addMember(request, owner, project.id, member);
  const response = await request.post(`${apiURL}/tasks/${task.id}/comments`, {
    headers: headers(owner),
    data: { content: 'Owner comment' },
  });
  expect(response.ok()).toBeTruthy();
  const comment = await response.json();
  await signIn(page, member);
  await page.goto(`/projects/${project.id}`);
  await expect(
    page.getByRole('heading', { name: project.name, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Delete project' }),
  ).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Create label' })).toHaveCount(
    0,
  );
  const options = { headers: headers(member) };
  expect(
    (
      await request.patch(`${apiURL}/projects/${project.id}`, {
        ...options,
        data: { name: 'Unauthorized' },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.delete(`${apiURL}/projects/${project.id}`, options)
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post(`${apiURL}/projects/${project.id}/labels`, {
        ...options,
        data: { name: 'Unauthorized' },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.patch(
        `${apiURL}/projects/${project.id}/members/${membership.id}`,
        { ...options, data: { role: 'ADMIN' } },
      )
    ).status(),
  ).toBe(403);
  await page.goto(`/tasks/${task.id}`);
  const article = page.locator('article').filter({ hasText: 'Owner comment' });
  await expect(article).toBeVisible();
  await expect(
    article.getByRole('button', { name: 'Edit', exact: true }),
  ).toHaveCount(0);
  await expect(
    article.getByRole('button', { name: 'Delete', exact: true }),
  ).toHaveCount(0);
  const commentURL = `${apiURL}/tasks/${task.id}/comments/${comment.id}`;
  expect(
    (
      await request.patch(commentURL, {
        ...options,
        data: { content: 'Unauthorized' },
      })
    ).status(),
  ).toBe(403);
  expect((await request.delete(commentURL, options)).status()).toBe(403);
  await page.getByPlaceholder('Write a comment...').fill('Member comment');
  await page.getByRole('button', { name: 'Add comment' }).click();
  await expect(
    page.locator('article').filter({ hasText: 'Member comment' }),
  ).toBeVisible();
});

test('admin cannot promote members, remove owner, or delete project; owner can revoke access', async ({
  page,
  request,
}) => {
  const owner = await createUser(request);
  const admin = await createUser(request);
  const member = await createUser(request);
  const { project, task } = await createWorkspace(request, owner);
  const adminMembership = await addMember(
    request,
    owner,
    project.id,
    admin,
    'ADMIN',
  );
  const membership = await addMember(request, owner, project.id, member);
  const membersResponse = await request.get(
    `${apiURL}/projects/${project.id}/members`,
    { headers: headers(owner) },
  );
  expect(membersResponse.ok()).toBeTruthy();
  const members: { id: number; role: string }[] = await membersResponse.json();
  const ownerMembership = members.find((item) => item.role === 'OWNER')!;
  const options = { headers: headers(admin) };
  expect(
    (
      await request.patch(
        `${apiURL}/projects/${project.id}/members/${membership.id}`,
        { ...options, data: { role: 'ADMIN' } },
      )
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.patch(
        `${apiURL}/projects/${project.id}/members/${ownerMembership.id}`,
        { ...options, data: { role: 'MEMBER' } },
      )
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.delete(
        `${apiURL}/projects/${project.id}/members/${ownerMembership.id}`,
        options,
      )
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.delete(`${apiURL}/projects/${project.id}`, options)
    ).status(),
  ).toBe(403);
  await signIn(page, admin);
  await page.goto(`/projects/${project.id}`);
  await expect(
    page.getByRole('button', { name: 'Create label' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Delete project' }),
  ).toHaveCount(0);
  expect(
    (
      await request.delete(
        `${apiURL}/projects/${project.id}/members/${adminMembership.id}`,
        { headers: headers(owner) },
      )
    ).ok(),
  ).toBeTruthy();
  expect(
    (await request.get(`${apiURL}/projects/${project.id}`, options)).status(),
  ).toBe(404);
  expect(
    (await request.get(`${apiURL}/tasks/${task.id}`, options)).status(),
  ).toBe(404);
  await page.reload();
  // React Query retries failed reads before rendering the access error.
  await expect(
    page.getByRole('heading', { name: 'Project not found', exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await expect(
    page.getByRole('heading', { name: project.name, exact: true }),
  ).toHaveCount(0);
});

test('outsider cannot read task resources, download attachments, or read another user notification', async ({
  request,
}) => {
  const owner = await createUser(request);
  const outsider = await createUser(request);
  const { project, task } = await createWorkspace(request, owner);
  const uploaded = await request.post(
    `${apiURL}/tasks/${task.id}/attachments`,
    {
      headers: headers(owner),
      multipart: {
        file: {
          name: 'private.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('private'),
        },
      },
    },
  );
  expect(uploaded.ok()).toBeTruthy();
  const attachment = await uploaded.json();
  const member = await createUser(request);
  await addMember(request, owner, project.id, member);
  const notifications = await request.get(`${apiURL}/notifications`, {
    headers: headers(member),
  });
  expect(notifications.ok()).toBeTruthy();
  const { data } = await notifications.json();
  expect(data.length).toBeGreaterThan(0);
  for (const path of [
    `/projects/${project.id}`,
    `/tasks/${task.id}`,
    `/tasks/${task.id}/comments`,
    `/tasks/${task.id}/labels`,
    `/tasks/${task.id}/attachments`,
    `/tasks/${task.id}/attachments/${attachment.id}/download`,
  ]) {
    expect(
      (
        await request.get(`${apiURL}${path}`, { headers: headers(outsider) })
      ).status(),
      path,
    ).toBe(404);
  }
  expect(
    (
      await request.patch(`${apiURL}/notifications/${data[0].id}/read`, {
        headers: headers(outsider),
      })
    ).status(),
  ).toBe(404);
  const ownNotifications = await request.get(`${apiURL}/notifications`, {
    headers: headers(outsider),
  });
  expect(await ownNotifications.json()).toMatchObject({
    data: [],
    unreadCount: 0,
  });
});
