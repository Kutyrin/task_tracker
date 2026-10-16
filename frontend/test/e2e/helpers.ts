import { randomUUID } from 'node:crypto';
import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const apiURL = process.env.E2E_API_URL ?? 'http://localhost:3001';
export const mailURL = process.env.E2E_MAIL_URL ?? 'http://localhost:8025';
export const unique = () => randomUUID().replaceAll('-', '').slice(0, 10);
export type User = {
  id: number;
  email: string;
  password: string;
  accessToken: string;
  refreshToken: string;
};
export const headers = (user: User) => ({
  Authorization: `Bearer ${user.accessToken}`,
});

export async function createUser(request: APIRequestContext): Promise<User> {
  const credentials = {
    email: `e2e-${unique()}@example.test`,
    password: 'TestPassword123!',
  };
  const registered = await request.post(`${apiURL}/auth/register`, {
    data: credentials,
  });
  expect(registered.ok()).toBeTruthy();
  const user = await registered.json();
  const login = await request.post(`${apiURL}/auth/login`, {
    data: credentials,
  });
  expect(login.ok()).toBeTruthy();
  return { ...credentials, id: user.id, ...(await login.json()) };
}

export async function signIn(
  page: Page,
  user: Pick<User, 'email' | 'password'>,
) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL('/dashboard');
}

export async function createWorkspace(request: APIRequestContext, owner: User) {
  const projectResponse = await request.post(`${apiURL}/projects`, {
    headers: headers(owner),
    data: {
      name: `E2E ${unique()}`,
      key: `E${unique().slice(0, 9).toUpperCase()}`,
    },
  });
  expect(projectResponse.ok()).toBeTruthy();
  const project: { id: number; name: string } = await projectResponse.json();
  const boardResponse = await request.post(`${apiURL}/boards`, {
    headers: headers(owner),
    data: { projectId: project.id, name: 'E2E board' },
  });
  expect(boardResponse.ok()).toBeTruthy();
  const board = await boardResponse.json();
  const details = await request.get(`${apiURL}/boards/${board.id}`, {
    headers: headers(owner),
  });
  expect(details.ok()).toBeTruthy();
  const { columns } = await details.json();
  const taskResponse = await request.post(`${apiURL}/tasks`, {
    headers: headers(owner),
    data: {
      projectId: project.id,
      columnId: columns[0].id,
      title: `Issue ${unique()}`,
    },
  });
  expect(taskResponse.ok()).toBeTruthy();
  const task: { id: number; title: string } = await taskResponse.json();
  return { project, task, board };
}

export async function addMember(
  request: APIRequestContext,
  owner: User,
  projectId: number,
  user: User,
  role = 'MEMBER',
) {
  const response = await request.post(
    `${apiURL}/projects/${projectId}/members`,
    {
      headers: headers(owner),
      data: { email: user.email, role },
    },
  );
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as { id: number };
}

export async function messagesFor(request: APIRequestContext, email: string) {
  const response = await request
    .get(`${mailURL}/api/v1/search`, {
      params: { query: `to:${email}` },
    })
    .catch((cause: unknown) => {
      throw new Error(
        `Mailpit is unavailable at ${mailURL}. Start Compose with --profile e2e and BACKEND_ENV_FILE=./backend/test/e2e.env (see README, Frontend E2E). Set E2E_MAIL_URL when using another port.`,
        { cause },
      );
    });
  expect(
    response.ok(),
    'Mailpit must be running; enable the e2e Compose profile',
  ).toBeTruthy();
  return (await response.json()) as {
    messages_count: number;
    messages: { ID: string }[];
  };
}
