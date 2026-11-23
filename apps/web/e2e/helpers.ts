import type { Page } from '@playwright/test';

/** Signs in with a demo profile, by its role label on the sign-in page. */
export async function signInAs(page: Page, role: RegExp) {
  await page.goto('/connexion');
  await page.getByRole('button', { name: role }).click();
}
