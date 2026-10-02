import { expect, test } from '@playwright/test';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

interface ProjectResponse {
  id: number;
}

interface BoardResponse {
  id: number;
}

function createCredentials() {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

  return {
    email: `e2e-task-${suffix}@example.com`,
    password: 'TestPassword123',
  };
}

function createProjectKey() {
  return `E2E${Date.now().toString(36).slice(-7).toUpperCase()}`;
}

test('user can create and move a task', async ({ page, request }) => {
  const credentials = createCredentials();

  const registerResponse = await request.post(
    'http://localhost:3001/auth/register',
    {
      data: {
        email: credentials.email,
        password: credentials.password,
      },
    },
  );

  expect(registerResponse.ok()).toBeTruthy();

  const loginResponse = await request.post('http://localhost:3001/auth/login', {
    data: {
      email: credentials.email,
      password: credentials.password,
    },
  });

  expect(loginResponse.ok()).toBeTruthy();

  const auth = (await loginResponse.json()) as AuthResponse;

  const projectResponse = await request.post('http://localhost:3001/projects', {
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
    },
    data: {
      name: `E2E Project ${Date.now()}`,
      key: createProjectKey(),
      description: 'Playwright E2E project',
    },
  });

  expect(projectResponse.ok()).toBeTruthy();

  const project = (await projectResponse.json()) as ProjectResponse;

  const boardResponse = await request.post('http://localhost:3001/boards', {
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
    },
    data: {
      projectId: project.id,
      name: 'E2E Board',
    },
  });

  expect(boardResponse.ok()).toBeTruthy();

  const board = (await boardResponse.json()) as BoardResponse;

  await page.goto('/login');

  await page.getByLabel('Email').fill(credentials.email);
  await page.getByLabel('Password').fill(credentials.password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL('/dashboard');

  await page.goto(`/boards/${board.id}`);

  await expect(page.getByRole('heading', { name: 'E2E Board' })).toBeVisible();

  const taskTitle = `E2E task ${Date.now()}`;

  await page.getByLabel('Title').fill(taskTitle);
  await page.getByRole('button', { name: 'Create issue' }).click();

  const task = page.locator('article').filter({
    hasText: taskTitle,
  });

  await expect(task).toBeVisible();

  const inProgressColumn = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'In Progress' }),
  });

  await expect(inProgressColumn).toBeVisible();

  const inProgressHeading = inProgressColumn.getByRole('heading', {
    name: 'In Progress',
  });

  await expect(inProgressHeading).toBeVisible();

  const boardDetailsResponse = await request.get(
    `http://localhost:3001/boards/${board.id}`,
    {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
      },
    },
  );

  expect(boardDetailsResponse.ok()).toBeTruthy();

  const boardDetails = (await boardDetailsResponse.json()) as {
    columns: {
      id: number;
      name: string;
    }[];
  };

  const inProgressBoardColumn = boardDetails.columns.find(
    (column) => column.name === 'In Progress',
  );

  expect(inProgressBoardColumn).toBeDefined();

  const taskLink = task.getByRole('link').first();
  const taskHref = await taskLink.getAttribute('href');

  expect(taskHref).toMatch(/^\/tasks\/\d+$/);

  const taskId = Number(taskHref?.split('/').at(-1));

  expect(taskId).toBeGreaterThan(0);

  const dropZone = inProgressColumn.locator('div.mt-4.min-h-72');

  const taskBox = await task.boundingBox();
  const dropZoneBox = await dropZone.boundingBox();

  expect(taskBox).not.toBeNull();
  expect(dropZoneBox).not.toBeNull();

  await page.mouse.move(
    taskBox!.x + taskBox!.width / 2,
    taskBox!.y + taskBox!.height / 2,
  );

  await page.mouse.down();

  await page.mouse.move(
    taskBox!.x + taskBox!.width / 2 + 20,
    taskBox!.y + taskBox!.height / 2 + 20,
    { steps: 5 },
  );

  await page.mouse.move(
    dropZoneBox!.x + dropZoneBox!.width / 2,
    dropZoneBox!.y + Math.min(80, dropZoneBox!.height / 2),
    { steps: 15 },
  );

  await page.waitForTimeout(300);
  await page.mouse.up();

  await expect
    .poll(
      async () => {
        const response = await request.get(
          `http://localhost:3001/tasks/${taskId}`,
          {
            headers: {
              Authorization: `Bearer ${auth.accessToken}`,
            },
          },
        );

        if (!response.ok()) {
          return null;
        }

        const movedTask = (await response.json()) as {
          columnId: number | null;
        };

        return movedTask.columnId;
      },
      {
        timeout: 10000,
        intervals: [250, 500, 1000],
      },
    )
    .toBe(inProgressBoardColumn!.id);

  await page.reload();

  await expect(
    page
      .locator('section')
      .filter({
        has: page.getByRole('heading', { name: 'In Progress' }),
      })
      .locator('article')
      .filter({
        hasText: taskTitle,
      }),
  ).toBeVisible();
});
