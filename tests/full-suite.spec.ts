import { test, expect } from '@playwright/test';

const BASE_URL = 'https://traject-iq.vercel.app';
const EMAIL = 'csreekhaanthch@gmail.com';
const PASSWORD = 'Lilly@1728';

// Pages to test
const PAGES = [
  '/',
  '/dashboard',
  '/settings',
  '/profile',
  '/about',
];

// Login helper
async function login(page) {
  // Go to login page
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 120000 });

  // Wait for email field
  await page.locator('input[name="email"]').waitFor({ timeout: 120000 });
  await page.fill('input[name="email"]', EMAIL);

  // Wait for password field
  await page.locator('input[name="password"]').waitFor({ timeout: 120000 });
  await page.fill('input[name="password"]', PASSWORD);

  // Wait for login button to become enabled
  await page.locator('button[type="submit"]:not([disabled])').waitFor({ timeout: 120000 });
  await page.click('button[type="submit"]');

  // Wait for post-login page to fully load
  await page.waitForLoadState('networkidle', { timeout: 120000 });
}

// Full QA suite
test.describe('TrajectIQ Full QA Suite', () => {

  test('Login works', async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/dashboard|home|profile/);
  });

  test('Navigate through main pages', async ({ page }) => {
    await login(page);
    for (const path of PAGES) {
      await page.goto(BASE_URL + path, { waitUntil: 'networkidle', timeout: 120000 });
      await expect(page).toHaveTitle(/./);
    }
  });

  test('Check all links on pages', async ({ page }) => {
    await login(page);
    const links = await page.locator('a').all();

    for (const link of links) {
      const href = await link.getAttribute('href');
      if (href && href.startsWith('http')) {
        const response = await page.goto(href, { waitUntil: 'networkidle', timeout: 120000 });
        expect(response?.status()).toBeLessThan(400);
      }
    }
  });

  test('Dashboard elements', async ({ page }) => {
    await login(page);

    // Example dashboard elements
    await expect(page.locator('text=Welcome')).toBeVisible();
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('button')).toHaveCountGreaterThan(0);
  });

  test('Forms / Input validation', async ({ page }) => {
    await login(page);
    await page.goto(BASE_URL + '/settings', { waitUntil: 'networkidle', timeout: 120000 });

    // Profile update form example
    const usernameField = page.locator('input[name="username"]');
    const bioField = page.locator('input[name="bio"]');
    const submitButton = page.locator('button[type="submit"]');

    await usernameField.waitFor({ timeout: 120000 });
    await usernameField.fill('Test User');

    await bioField.waitFor({ timeout: 120000 });
    await bioField.fill('Automated QA testing.');

    await submitButton.waitFor({ timeout: 120000 });
    await submitButton.click();

    await expect(page.locator('.success-message')).toBeVisible();
  });

});
