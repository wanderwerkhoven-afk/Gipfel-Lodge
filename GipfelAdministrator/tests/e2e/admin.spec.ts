import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('shell and tenant context render', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Accommodatie' })).toHaveValue('property_gipfel_lodge');
  await expect(page.getByText('DEMO · EMULATORS')).toBeAttached();
});

test('reservation wizard calculates and saves', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Nieuwe reservering' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('live prijsberekening')).toBeVisible();
  await page.getByRole('button', { name: 'Aanvraag opslaan' }).click();
  await expect(page.getByRole('status')).toContainText('Reservering als aanvraag opgeslagen');
});

test('calendar and guest workflow are reachable', async ({ page }) => {
  await page.goto('/');
  const mobile = (page.viewportSize()?.width ?? 1000) < 700;
  if (mobile) await page.getByRole('button', { name: 'Menu openen' }).click();
  await page.getByRole('button', { name: 'Kalender', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Kalender' })).toBeVisible();
  if (mobile) await page.getByRole('button', { name: 'Menu openen' }).click();
  await page.getByRole('button', { name: 'Gasten', exact: true }).click();
  await expect(page.getByText('20 gastprofielen')).toBeVisible();
});

test('accessibility has no serious or critical findings', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  const blocking = results.violations.filter(item => item.impact === 'serious' || item.impact === 'critical');
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
});
