import { expect, test } from '@playwright/test';

for (const width of [1440, 390]) {
  test(`theme follows system and preserves manual choice at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/login');
    const root = page.locator('html');
    const light = page.getByRole('button', {
      name: 'Light theme',
      exact: true,
    });
    const dark = page.getByRole('button', { name: 'Dark theme', exact: true });
    await expect(root).toHaveClass(/dark/);
    await expect(dark).toHaveAttribute('aria-pressed', 'true');
    await light.focus();
    await page.keyboard.press('Enter');
    await expect(root).not.toHaveClass(/dark/);
    await expect(light).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await expect(light).toHaveAttribute('aria-pressed', 'true');
    await dark.click();
    await page.getByRole('link', { name: 'Forgot password?' }).click();
    await expect(page).toHaveURL('/forgot-password');
    await expect(dark).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await expect(root).toHaveClass(/dark/);
    await expect(
      page.getByRole('button', { name: 'Send reset instructions' }),
    ).toHaveCSS('background-color', 'rgb(255, 146, 0)');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
