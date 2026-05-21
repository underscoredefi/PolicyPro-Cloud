import { test, expect } from '@playwright/test';

// ─── Auth / Login Page ────────────────────────────────────────────────────────

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Dismiss version overlays — they're dynamically appended and block clicks
    await page.evaluate(() => {
      document.querySelectorAll('.update-overlay').forEach(el => el.remove());
      // Also suppress future auto-show by faking version seen
      try { localStorage.setItem('pp_last_seen_version', '999'); } catch {}
    });
  });

  test('has correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/PolicyPro/i);
  });

  test('login form is visible', async ({ page }) => {
    await expect(page.locator('#auth-email')).toBeVisible();
    await expect(page.locator('#auth-password')).toBeVisible();
    await expect(page.locator('#auth-submit')).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.fill('#auth-email', 'bad@example.com');
    await page.fill('#auth-password', 'wrongpassword123');
    await page.click('#auth-submit');
    // Error appears in #auth-message div
    await expect(page.locator('#auth-message')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('#auth-message')).not.toBeEmpty();
  });
});

// ─── App Redirect (unauthenticated) ──────────────────────────────────────────

test.describe('App Auth Guard', () => {
  test('app.html shows sign-in message when unauthenticated', async ({ page }) => {
    await page.goto('/app.html');
    // app.js auth guard: window.location.href = 'index.html' when no session
    await expect(page).toHaveURL(/index\.html|\/$/, { timeout: 10000 });
  });
});

// ─── Authenticated flows (requires TEST_EMAIL + TEST_PASSWORD env vars) ───────

const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

test.describe('Authenticated CRM', () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Set TEST_EMAIL and TEST_PASSWORD to run auth tests');

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Dismiss version overlays before interacting
    await page.evaluate(() => {
      document.querySelectorAll('.update-overlay').forEach(el => el.remove());
      try { localStorage.setItem('pp_last_seen_version', '999'); } catch {}
    });
    await page.fill('#auth-email', TEST_EMAIL!);
    await page.fill('#auth-password', TEST_PASSWORD!);
    await page.click('#auth-submit');
    // index.html IS the CRM — login toggles body.authenticated class, no URL change
    await page.waitForSelector('body.authenticated', { timeout: 15000 });
  });

  test('CRM loads after login', async ({ page }) => {
    // body.authenticated means CRM UI is visible
    await expect(page.locator('body.authenticated')).toBeAttached();
    // Sidebar should be visible
    await expect(page.locator('#sidebar, .sidebar')).toBeVisible();
  });

  test('prospects section loads', async ({ page }) => {
    await page.click('[data-section="prospects"], a:has-text("Prospects"), #nav-prospects');
    await expect(page.locator('#content, .content, #main-content')).toBeVisible();
  });

  test('clients section loads', async ({ page }) => {
    await page.click('[data-section="clients"], a:has-text("Clients"), #nav-clients');
    await expect(page.locator('#content, .content, #main-content')).toBeVisible();
  });

  test('sync status indicator visible', async ({ page }) => {
    await expect(page.locator('#sync-status-dot, #sync-status-label').first()).toBeVisible({ timeout: 8000 });
  });

  test('can open add new record modal', async ({ page }) => {
    await page.click('#add-btn, button:has-text("Add"), button:has-text("New")');
    await expect(page.locator('#modal-overlay')).toBeVisible({ timeout: 5000 });
  });

  test('sign out returns to auth screen', async ({ page }) => {
    // Sign out is a nav-item div (not a button), onclick="handleSignOut()"
    await page.click('.nav-item:has-text("Sign Out")');
    // handleSignOut → window.location.replace('index.html')
    await expect(page).toHaveURL(/index\.html|\/$/, { timeout: 8000 });
  });
});
