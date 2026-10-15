import { expect, test } from '@playwright/test';
import { createUser, createWorkspace, signIn } from './helpers';

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test(`navigation and notification keyboard access at ${viewport.width}px`, async ({
    page,
    request,
  }) => {
    await page.setViewportSize(viewport);
    const user = await createUser(request);
    await createWorkspace(request, user);
    await signIn(page, user);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);

    const navigation = page.getByRole('navigation', {
      name: 'Main navigation',
    });
    await expect(
      navigation.getByRole('link', { name: 'Overview' }),
    ).toHaveAttribute('aria-current', 'page');
    const notifications = page.getByRole('button', {
      name: 'Notifications',
      exact: true,
    });
    await notifications.focus();
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('dialog', { name: 'Notifications' }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(
      page.getByRole('dialog', { name: 'Notifications' }),
    ).toBeHidden();
    await expect(notifications).toBeFocused();

    await navigation
      .getByRole('link', { name: 'Projects', exact: true })
      .click();
    await expect(page).toHaveURL('/projects');
    await expect(
      navigation.getByRole('link', { name: 'Projects', exact: true }),
    ).toHaveAttribute('aria-current', 'page');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
}
