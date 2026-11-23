import { expect, test, type Page } from '@playwright/test';
import { signInAs } from './helpers';

/** A page wider than the screen makes phones zoom out, and taps land on the wrong element. */
async function expectNoHorizontalOverflow(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(scroll, `${path} is ${scroll}px wide on a ${client}px screen`).toBeLessThanOrEqual(client);
}

test('public pages fit the phone screen', async ({ page }) => {
  for (const path of ['/connexion', '/inscription']) await expectNoHorizontalOverflow(page, path);
});

test('staff pages fit the phone screen', async ({ page }) => {
  await signInAs(page, /Administrateur ACOREP/);
  for (const path of [
    '/',
    '/declarations',
    '/declarations/dec-00850',
    '/etablissements',
    '/etablissements/est-0001',
    '/etablissements/nouveau',
    '/compte',
  ]) {
    await expectNoHorizontalOverflow(page, path);
  }
});

test('importer pages fit the phone screen', async ({ page }) => {
  await signInAs(page, /Opérateur pharmaceutique/);
  for (const path of ['/declarations', '/declarations/nouvelle', '/etablissements/est-0001']) {
    await expectNoHorizontalOverflow(page, path);
  }
});
