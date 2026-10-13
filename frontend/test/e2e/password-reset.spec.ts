import { expect, test } from '@playwright/test';
import {
  apiURL,
  createUser,
  mailURL,
  messagesFor,
  signIn,
  unique,
} from './helpers';

test('password reset email changes credentials, revokes refresh token and cannot be reused', async ({
  page,
  request,
}) => {
  const user = await createUser(request);
  await page.goto('/login');
  await page.getByRole('link', { name: /forgot password/i }).click();
  await expect(page).toHaveURL('/forgot-password');
  await page.getByLabel('Email').fill(user.email);
  await page.getByRole('button', { name: 'Send reset instructions' }).click();
  await expect(page.getByRole('status')).toContainText(
    'If an account with that email exists',
  );
  await expect
    .poll(async () => (await messagesFor(request, user.email)).messages_count)
    .toBe(1);
  const mailbox = await messagesFor(request, user.email);
  const response = await request.get(
    `${mailURL}/api/v1/message/${mailbox.messages[0].ID}`,
  );
  expect(response.ok()).toBeTruthy();
  const message: { Text: string; Subject: string } = await response.json();
  expect(message.Subject).toBe('Reset your Task Tracker password');
  const link = message.Text.match(
    /https?:\/\/[^\s]+\/reset-password\?token=[\w-]+/,
  )?.[0];
  expect(link).toBeTruthy();
  const resetURL = new URL(link!);
  expect(resetURL.origin).toBe(new URL(page.url()).origin);
  await page.goto(link!);
  const newPassword = 'ChangedPassword456!';
  await page.getByLabel('New password', { exact: true }).fill(newPassword);
  await page.getByLabel('Confirm new password').fill('DifferentPassword');
  await page
    .getByRole('button', { name: 'Reset password', exact: true })
    .click();
  await expect(
    page.getByText('Passwords do not match', { exact: true }),
  ).toBeVisible();
  await page.getByLabel('Confirm new password').fill(newPassword);
  await page
    .getByRole('button', { name: 'Reset password', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText(
    'Your password has been changed successfully',
  );
  expect(
    (
      await request.post(`${apiURL}/auth/login`, {
        data: { email: user.email, password: user.password },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.post(`${apiURL}/auth/refresh`, {
        data: { refreshToken: user.refreshToken },
      })
    ).status(),
  ).toBe(401);
  await page.goto(link!);
  await page
    .getByLabel('New password', { exact: true })
    .fill('AnotherPassword789!');
  await page.getByLabel('Confirm new password').fill('AnotherPassword789!');
  await page
    .getByRole('button', { name: 'Reset password', exact: true })
    .click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    'invalid or expired',
  );
  await signIn(page, { ...user, password: newPassword });
});

test('unknown email receives the same confirmation without a message', async ({
  page,
  request,
}) => {
  const email = `missing-${unique()}@example.test`;
  await page.goto('/forgot-password');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Send reset instructions' }).click();
  await expect(page.getByRole('status')).toContainText(
    'If an account with that email exists',
  );
  expect((await messagesFor(request, email)).messages_count).toBe(0);
});

test('missing and invalid reset tokens are rejected', async ({ page }) => {
  await page.goto('/reset-password');
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    'invalid or expired',
  );
  await expect(
    page.getByRole('button', { name: 'Reset password' }),
  ).toHaveCount(0);
  await page.goto('/reset-password?token=invalid-e2e-token');
  await page
    .getByLabel('New password', { exact: true })
    .fill('ChangedPassword456!');
  await page.getByLabel('Confirm new password').fill('ChangedPassword456!');
  await page
    .getByRole('button', { name: 'Reset password', exact: true })
    .click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    'invalid or expired',
  );
});
