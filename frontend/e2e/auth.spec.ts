import { expect, test } from '@playwright/test';

function createCredentials() {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

  return {
    email: `e2e-${suffix}@example.com`,
    password: 'TestPassword123',
  };
}

test('user can register and reach dashboard', async ({ page }) => {
  const credentials = createCredentials();

  await page.goto('/register');

  await page.getByLabel('Email').fill(credentials.email);
  await page.getByLabel('Password', { exact: true }).fill(credentials.password);
  await page.getByLabel('Confirm password').fill(credentials.password);

  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL('/dashboard');
  await expect(
    page.getByRole('heading', {
      name: `Welcome, ${credentials.email}`,
    }),
  ).toBeVisible();
});

test('user can sign in', async ({ page, request }) => {
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

  await page.goto('/login');

  await page.getByLabel('Email').fill(credentials.email);
  await page.getByLabel('Password').fill(credentials.password);

  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL('/dashboard');
  await expect(
    page.getByRole('heading', {
      name: `Welcome, ${credentials.email}`,
    }),
  ).toBeVisible();
});
