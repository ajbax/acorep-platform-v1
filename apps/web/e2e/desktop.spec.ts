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

test('an importer declares an air shipment from the AMM register and the officer sees it', async ({ page }) => {
  await signInAs(page, /Opérateur pharmaceutique/);
  await page.getByRole('link', { name: 'Nouvelle déclaration' }).first().click();

  await page.getByRole('radio', { name: /Aérien/ }).click();
  await page.getByRole('radio', { name: /N.djili/ }).click();
  await page.locator('#transportDocument').fill('071-55512345');
  await page.locator('#carrier').fill('Ethiopian Cargo');
  await page.locator('#expectedArrival').fill('2026-12-20');
  await page.getByRole('button', { name: 'Continuer' }).click();

  await page.locator('#supplier').fill('Ganga Lifesciences Ltd');
  await page.locator('#shipmentCountry').selectOption('IN');
  await page.getByRole('button', { name: 'Continuer' }).click();

  // No product yet: blocked. Then pick one from the register.
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.getByText('Ajoutez au moins un produit.')).toBeVisible();
  await page.locator('#product-search').fill('amox');
  await page.getByRole('button', { name: /Amoxicilline Gé/ }).click();
  await expect(page.getByText('Prérempli depuis le répertoire des AMM')).toBeVisible();
  const id = (await page.locator('input[id$="-manufacturer"]').first().getAttribute('id'))!.replace(
    '-manufacturer',
    '',
  );
  await page.locator(`#${id}-manufacturer`).fill('Ganga Lifesciences Ltd');
  await page.locator(`#${id}-batchNumber`).fill('IN55121');
  await page.locator(`#${id}-expiryDate`).fill('2028-08-31');
  await page.locator(`#${id}-quantity`).fill('12 000');
  await page.locator(`#${id}-unitPrice`).fill('1,75');
  await expect(page.getByText('21\u00a0000,00\u00a0$US').first()).toBeVisible();
  await page.getByRole('button', { name: 'Continuer' }).click();

  await page.getByText(/Je certifie sur l’honneur/).click();
  await page.getByRole('button', { name: 'Soumettre à l’ACOREP' }).click();
  await expect(page.getByRole('heading', { name: 'Déclaration soumise' })).toBeVisible();
  await page.getByRole('link', { name: 'Voir la déclaration' }).click();
  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toHaveText(/^DI-\d{4}-\d{6}$/);
  const reference = (await heading.textContent())!;

  // The import officer finds it among new submissions.
  await page.goto('/compte');
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await signInAs(page, /Direction Import & Export/);
  await page.goto('/declarations?status=SUBMITTED');
  await expect(page.getByRole('link', { name: new RegExp(reference) })).toBeVisible();
});

test('the menu panel opens with live previews and closes with Escape', async ({ page }) => {
  await signInAs(page, /Administrateur ACOREP/);
  await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
  const panel = page.getByRole('dialog', { name: 'Ouvrir le menu' });
  await expect(panel.getByText('Classement des provinces')).toBeVisible();
  await panel
    .getByRole('link', { name: /Importations/ })
    .first()
    .hover();
  await expect(panel.getByText('Nouvelles soumissions').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Ouvrir le menu' })).toBeFocused();
});
