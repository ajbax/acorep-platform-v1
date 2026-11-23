import { expect, test } from '@playwright/test';
import { signInAs } from './helpers';

test('the national map shows a province and links to its establishments', async ({ page }) => {
  await signInAs(page, /Administrateur ACOREP/);
  await expect(page.getByRole('heading', { name: 'Situation nationale' })).toBeVisible();

  await page.getByRole('button', { name: /^Haut-Katanga :/ }).click();
  await expect(page.getByText('Chef-lieu : Lubumbashi').first()).toBeVisible();

  // Switching the indicator relabels the provinces for screen readers.
  await page.getByRole('radio', { name: 'Valeur importée (USD)' }).click();
  await expect(page.getByRole('button', { name: /^Kinshasa : .*\$/ })).toBeVisible();

  await page.getByRole('link', { name: 'Voir les établissements' }).click();
  await expect(page).toHaveURL(/province=CD-HK/);
  await expect(page.getByRole('combobox', { name: 'Province' })).toHaveValue('CD-HK');
});

test('leadership sees establishments without contact details', async ({ page }) => {
  await signInAs(page, /Direction générale/);
  await page.goto('/etablissements?kind=PHARMACY');
  await page.getByRole('table').getByRole('link').first().click();
  await expect(page.getByText('Non communiqué à votre profil').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Actions' })).toHaveCount(0);
});
