import { test } from '@playwright/test';

test('inspect homepage resume', async ({ page }) => {
  page.on('console', (msg) => {
    console.log(`BROWSER_CONSOLE ${msg.type()} ${msg.text()}`);
  });
  page.on('pageerror', (err) => {
    console.log(`BROWSER_PAGEERROR ${err.message}`);
  });
  page.on('requestfailed', (req) => {
    console.log(`BROWSER_REQ_FAILED ${req.method()} ${req.url()} ${req.failure()?.errorText ?? ''}`);
  });

  const response = await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
  console.log(`NAV_STATUS ${response?.status()}`);

  await page.waitForTimeout(3000);

  const bodyText = ((await page.textContent('body')) || '').trim();
  console.log(`BODY_TEXT_LEN ${bodyText.length}`);

  const firstHeading = await page.locator('h1').first().textContent().catch(() => null);
  console.log(`FIRST_H1 ${JSON.stringify(firstHeading)}`);

  const firstLinkText = await page.locator('a').first().textContent().catch(() => null);
  console.log(`FIRST_LINK_TEXT ${JSON.stringify(firstLinkText)}`);

  const hasHiddenTemplate = await page.locator('q\\:template[hidden]').count();
  console.log(`HIDDEN_TEMPLATE_COUNT ${hasHiddenTemplate}`);

  await page.screenshot({ path: 'tmp/pw-check.png', fullPage: true });
});
