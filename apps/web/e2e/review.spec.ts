import { expect, test } from '@playwright/test';
import { signInAs } from './helpers';

test('an import officer must explain a refusal, and it is recorded in the history', async ({ page }) => {
  await signInAs(page, /Direction Import & Export/);
  await page.goto('/declarations?status=UNDER_REVIEW');
  await page.getByRole('listitem').getByRole('link').first().click();
  await expect(page.getByRole('heading', { name: /^DI-/ })).toBeVisible();

  await page.getByRole('button', { name: 'Refuser' }).click();
  await expect(page.getByRole('button', { name: 'Confirmer' })).toBeDisabled();
  await page.getByLabel(/Commentaire/).fill('Produit sans AMM valide pour ce dosage.');
  await page.getByRole('button', { name: 'Confirmer' }).click();

  await expect(page.getByText('Refusée').first()).toBeVisible();
  await expect(page.getByText('Produit sans AMM valide pour ce dosage.')).toBeVisible();
  // The decision is final: no more actions, and the form is closed.
  await expect(page.getByRole('button', { name: 'Confirmer' })).toHaveCount(0);
  await expect(page.getByText('Aucune action disponible pour votre profil.')).toBeVisible();
});

test('an importer only sees its own declarations and has no national view', async ({ page }) => {
  await signInAs(page, /Opérateur pharmaceutique/);
  await expect(page).toHaveURL(/\/declarations$/);
  await expect(page.getByRole('listitem').getByRole('link').first()).toBeVisible();
  const names = await page.getByRole('listitem').getByRole('link').allInnerTexts();
  expect(names.length).toBeGreaterThan(0);
  for (const n of names) expect(n).toContain('Fleuve Santé Distribution SARL');
  await page.goto('/');
  await expect(page).toHaveURL(/\/declarations$/);
});

test('a provincial officer only sees establishments of their province', async ({ page }) => {
  await signInAs(page, /Agent de division provinciale/);
  await page.goto('/etablissements');
  await expect(page.getByRole('listitem').getByRole('link').first()).toBeVisible();
  const rows = await page.getByRole('listitem').getByRole('link').allInnerTexts();
  expect(rows.length).toBeGreaterThan(0);
  for (const r of rows) expect(r).toContain('Haut-Katanga');
});
