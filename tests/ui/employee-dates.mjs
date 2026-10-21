import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.HR_QA_URL || 'http://127.0.0.1:3017';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const errors = [];
let checks = 0;
try {
  for (const width of [1440, 390]) {
    for (const dark of [false, true]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
      await page.goto(`${base}/tests/ui/employee-dates.html`);
      await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), dark);
      const next = page.getByRole('button', { name: 'Next', exact: true });
      const birth = page.getByLabel('Tanggal Lahir', { exact: true });
      await birth.waitFor();
      assert.equal(await birth.inputValue(), '29/02/2000');
      await birth.fill('31/02/2000');
      assert.equal(await birth.evaluate(input => input.checkValidity()), false);
      await next.click();
      assert.equal(await birth.isVisible(), true);
      await birth.fill('29022000');
      assert.equal(await birth.inputValue(), '29/02/2000');
      await next.click();
      await next.click();
      const join = page.getByLabel('Join Date', { exact: true });
      assert.equal(await join.inputValue(), '01/10/2026');
      await join.fill('02/10/2026');
      await next.click();
      assert.equal(await page.locator('#employee-contractStartDate').inputValue(), '02/10/2026');
      const end = page.getByLabel('Tanggal Selesai Masa Percobaan', { exact: true });
      assert.equal(await end.inputValue(), '04/01/2027');
      assert.equal(await end.evaluate(input => {
        const scroller = input.closest('form').querySelector('.overflow-y-auto');
        return scroller.scrollWidth <= scroller.clientWidth;
      }), true);
      const trigger = page.getByRole('button', { name: 'Pilih tanggal: Tanggal Selesai Masa Percobaan', exact: true });
      await trigger.click();
      const calendar = page.locator('[data-slot="popover-content"]');
      await calendar.waitFor();
      const box = await calendar.boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= width);
      if (process.env.HR_QA_SCREENSHOTS) await page.screenshot({ path: `${process.env.HR_QA_SCREENSHOTS}/employee-dates-calendar-${width}-${dark ? 'dark' : 'light'}.png` });
      await calendar.locator('[data-day="5/1/2027"]').click();
      await calendar.waitFor({ state: 'hidden' });
      assert.equal(await end.inputValue(), '05/01/2027');
      await trigger.click();
      await calendar.waitFor();
      await page.keyboard.press('Escape');
      await calendar.waitFor({ state: 'hidden' });
      assert.equal(await page.getByRole('dialog', { name: 'Edit Data Employee', exact: true }).isVisible(), true);
      await end.clear();
      assert.equal(await end.inputValue(), '');
      assert.equal(await end.getAttribute('placeholder'), 'DD/MM/YYYY');
      await end.fill('04012027');
      assert.equal(await end.inputValue(), '04/01/2027');
      await next.click();
      await page.getByRole('button', { name: /Simpan/ }).click();
      await page.waitForFunction(() => document.querySelector('#saved-employee')?.textContent);
      const saved = JSON.parse(await page.locator('#saved-employee').textContent());
      assert.equal(saved.dateOfBirth, '2000-02-29');
      assert.equal(saved.joinDate, '2026-10-02');
      assert.equal(saved.contractStartDate, '2026-10-02');
      assert.equal(saved.contractEndDate, '2027-01-04');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      checks += 20;
      await page.close();
    }
  }
  assert.deepEqual(errors, []);
  console.log(`PASS: ${checks} date-format checks across desktop/mobile and light/dark; no page errors.`);
} finally {
  await browser.close();
}
