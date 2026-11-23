import { expect, test } from '@playwright/test';

test('a new pharmacy registers itself and lands on its file, under review', async ({ page }) => {
  await page.goto('/connexion');
  await page.getByRole('link', { name: 'Inscrire mon établissement' }).click();

  // Step 1: nothing chosen → the step refuses to continue.
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.getByText('Corrigez les champs signalés pour continuer.')).toBeVisible();
  await page.getByRole('radio', { name: /Officine/ }).click();
  await page.getByLabel('Raison sociale').fill('Pharmacie Horizon Nouvelle');
  await page.getByRole('button', { name: 'Continuer' }).click();

  // Step 2: an empty RCCM says "required", a malformed one shows the expected format.
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.getByText('Champ obligatoire.').first()).toBeVisible();
  await page.getByLabel('RCCM').fill('123');
  await expect(page.getByText('Format attendu : CD/KNG/RCCM/23-B-01234.')).toBeVisible();
  await page.getByLabel('RCCM').fill('cd/kng/rccm/24-b-04567');
  await page.getByLabel('Id. Nat.').fill('01-83-N55555');
  await page.getByLabel('NIF').fill('A7654321C');
  await page.getByRole('button', { name: 'Continuer' }).click();

  await page.getByLabel('Province').selectOption('CD-KN');
  await expect(page.getByLabel('Ville')).toHaveValue('Kinshasa');
  await page.getByLabel('Adresse').fill('45, avenue de la Paix');
  await page.getByRole('button', { name: 'Continuer' }).click();

  await page.getByLabel('Nom complet').fill('Dr Grâce Mbuyi');
  await page.getByLabel(/Ordre/).fill('CNOP/7788');
  await page.locator('#pharmacistPhone').fill('081 555 0101');
  await page.locator('#contactPhone').fill('99 555 0102');
  await page.getByRole('button', { name: 'Continuer' }).click();

  await page.getByLabel('Nom du titulaire du compte').fill('Grâce Mbuyi');
  await page.getByLabel('E-mail de connexion').fill('grace@example.cd');
  await page.getByRole('button', { name: 'Continuer' }).click();

  // Review: numbers normalised, attestation required.
  await expect(page.getByText('+243815550101')).toBeVisible();
  await expect(page.getByText('CD/KNG/RCCM/24-B-04567')).toBeVisible();
  await page.getByRole('button', { name: 'Envoyer le dossier' }).click();
  await expect(page.getByText('Cochez la déclaration sur l’honneur pour envoyer.')).toBeVisible();
  await page.getByText(/Je certifie sur l’honneur/).click();
  await page.getByRole('button', { name: 'Envoyer le dossier' }).click();

  await expect(page.getByRole('heading', { name: 'Dossier envoyé' })).toBeVisible();
  await page.getByRole('link', { name: 'Voir le dossier' }).click();
  await expect(page.getByRole('heading', { name: 'Pharmacie Horizon Nouvelle' })).toBeVisible();
  await expect(page.getByText('Soumis', { exact: true }).first()).toBeVisible();
});
