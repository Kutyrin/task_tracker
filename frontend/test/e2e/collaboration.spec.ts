import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import {
  addMember,
  apiURL,
  createUser,
  createWorkspace,
  headers,
  signIn,
  unique,
} from './helpers';

test('owner creates a project, sees it in the list and deletes it', async ({
  page,
  request,
}) => {
  const owner = await createUser(request);
  await signIn(page, owner);
  await page.goto('/projects/new');
  const name = `Project ${unique()}`;
  await page.getByLabel('Project name').fill(name);
  await page
    .getByLabel('Project key')
    .fill(`E${unique().slice(0, 9).toUpperCase()}`);
  await page.getByLabel('Description').fill('Browser-created project');
  await page
    .getByRole('button', { name: 'Create project', exact: true })
    .click();
  await expect(page).toHaveURL(/\/projects\/\d+$/);
  const projectURL = page.url();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await page.goto('/projects');
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await page.goto(projectURL);
  page.once('dialog', (dialog) => dialog.accept());
  await page
    .getByRole('button', { name: 'Delete project', exact: true })
    .click();
  await expect(page).toHaveURL('/projects');
  await expect(page.getByRole('heading', { name, exact: true })).toHaveCount(0);
  expect(
    (
      await request.get(`${apiURL}/projects/${projectURL.split('/').at(-1)}`, {
        headers: headers(owner),
      })
    ).status(),
  ).toBe(404);
});

test('comment author can post, edit, persist and delete a comment', async ({
  page,
  request,
}) => {
  const owner = await createUser(request);
  const { task } = await createWorkspace(request, owner);
  await signIn(page, owner);
  await page.goto(`/tasks/${task.id}`);
  const section = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Comments', exact: true }),
  });
  await expect(
    section.getByRole('button', { name: 'Add comment' }),
  ).toBeDisabled();
  await section.getByPlaceholder('Write a comment...').fill('Initial comment');
  await section.getByRole('button', { name: 'Add comment' }).click();
  const comment = section.locator('article');
  await expect(comment).toContainText('Initial comment');
  await comment.getByRole('button', { name: 'Edit', exact: true }).click();
  await section.locator('textarea').last().fill('Edited comment');
  await section.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(comment).toContainText('Edited comment');
  await page.reload();
  await expect(comment).toContainText('Edited comment');
  page.once('dialog', (dialog) => dialog.accept());
  await comment.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(
    section.getByText('No comments yet.', { exact: true }),
  ).toBeVisible();
});

test('labels can be created, renamed, assigned, removed and deleted', async ({
  page,
  request,
}) => {
  const owner = await createUser(request);
  const { project, task } = await createWorkspace(request, owner);
  await signIn(page, owner);
  await page.goto(`/projects/${project.id}`);
  const labels = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Labels', exact: true }),
  });
  await labels.getByRole('button', { name: 'Create label' }).click();
  await labels.getByPlaceholder('Label name').fill('Regression');
  await labels.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(labels.getByText('Regression', { exact: true })).toBeVisible();
  await labels.getByRole('button', { name: 'Edit', exact: true }).click();
  await labels.getByRole('textbox').fill('Release');
  await labels.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(labels.getByText('Release', { exact: true })).toBeVisible();
  await page.goto(`/tasks/${task.id}`);
  await page.getByRole('button', { name: 'Edit labels' }).click();
  const selector = page
    .locator('select')
    .filter({ has: page.locator('option', { hasText: 'Select a label' }) });
  await selector.selectOption({ label: 'Release' });
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Remove', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText('Release', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit labels' }).click();
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(page.getByText('No labels.', { exact: true })).toBeVisible();
  await page.goto(`/projects/${project.id}`);
  page.once('dialog', (dialog) => dialog.accept());
  await labels.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(
    labels.getByText('No labels yet.', { exact: true }),
  ).toBeVisible();
});

test('attachments reject unsupported files and preserve downloaded bytes', async ({
  page,
  request,
}) => {
  const owner = await createUser(request);
  const { task } = await createWorkspace(request, owner);
  await signIn(page, owner);
  await page.goto(`/tasks/${task.id}`);
  const section = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Attachments', exact: true }),
  });
  const input = section.locator('input[type=file]');
  await input.setInputFiles({
    name: 'bad.html',
    mimeType: 'text/html',
    buffer: Buffer.from('<p>unsupported</p>'),
  });
  await expect(
    section.getByText('Unsupported file type.', { exact: true }),
  ).toBeVisible();
  await expect(
    section.getByRole('button', { name: 'Upload', exact: true }),
  ).toBeDisabled();
  await input.setInputFiles({
    name: 'large.txt',
    mimeType: 'text/plain',
    buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
  });
  await expect(
    section.getByText('File size must not exceed 5 MB.', { exact: true }),
  ).toBeVisible();
  const content = Buffer.from('Playwright attachment — проверка\n');
  await input.setInputFiles({
    name: 'e2e.txt',
    mimeType: 'text/plain',
    buffer: content,
  });
  await section.getByRole('button', { name: 'Upload', exact: true }).click();
  await expect(section.locator('article')).toContainText('e2e.txt');
  await page.reload();
  const downloadPromise = page.waitForEvent('download');
  await section.getByRole('button', { name: 'Download', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('e2e.txt');
  expect(await readFile((await download.path())!)).toEqual(content);
  page.once('dialog', (dialog) => dialog.accept());
  await section.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(
    section.getByText('No attachments yet.', { exact: true }),
  ).toBeVisible();
});

test('recipient opens a comment notification and marks all remaining notifications read', async ({
  page,
  request,
}) => {
  const owner = await createUser(request);
  const member = await createUser(request);
  const { project, task } = await createWorkspace(request, owner);
  await addMember(request, owner, project.id, member);
  for (const content of ['First comment', 'Second comment']) {
    const response = await request.post(`${apiURL}/tasks/${task.id}/comments`, {
      headers: headers(member),
      data: { content },
    });
    expect(response.ok()).toBeTruthy();
  }
  await signIn(page, owner);
  await page
    .getByRole('button', { name: 'Notifications', exact: true })
    .click();
  await expect(page.getByText('2 unread', { exact: true })).toBeVisible();
  await page
    .getByRole('button', {
      name: `New comment on task "${task.title}"`,
      exact: false,
    })
    .first()
    .click();
  await expect(page).toHaveURL(`/tasks/${task.id}`);
  await page
    .getByRole('button', { name: 'Notifications', exact: true })
    .click();
  await expect(page.getByText('1 unread', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Mark all as read' }).click();
  await expect(page.getByText('0 unread', { exact: true })).toBeVisible();
  await page.reload();
  await page
    .getByRole('button', { name: 'Notifications', exact: true })
    .click();
  await expect(page.getByText('0 unread', { exact: true })).toBeVisible();
});
