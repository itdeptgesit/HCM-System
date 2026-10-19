import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.HR_QA_URL || 'http://127.0.0.1:3012';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const errors = [];
let checks = 0;
try {
  for (const width of [1024, 1440]) {
    for (const dark of [false, true]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${base}/tests/ui/top-navigation.html`);
      await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), dark);
      const nav = page.getByRole('navigation', { name: 'Navigasi utama HR' });
      await nav.waitFor();
      for (const [label, path] of [['Data Karyawan', '/employees'], ['Pengajuan & Approval', '/requests'], ['Dashboard', '/']]) {
        await nav.getByRole('link', { name: label, exact: true }).click();
        await page.getByTestId('route').filter({ hasText: new RegExp(`^${path}$`) }).waitFor();
        assert.equal(await nav.getByRole('link', { name: label, exact: true }).getAttribute('aria-current'), 'page');
        checks++;
      }
      for (const [group, links] of [
        ['Absensi', [['Report', '/attendance/report'], ['Request Absen', '/attendance/requests'], ['Calendar', '/attendance/calendar'], ['Radius Office', '/attendance/locations']]],
        ['Informasi', [['Catatan SP Karyawan', '/disciplinary'], ['News & Pengumuman', '/news']]],
        ['Administrasi', [['Master Company', '/admin/companies'], ['Master Department', '/admin/departments'], ['Hierarchy Approval', '/admin/approval-hierarchy'], ['Permission Menu', '/admin/permissions'], ['Account Management', '/admin/accounts'], ['Log Aktivitas', '/admin/activity-logs'], ['Laporan & Analitik', '/analytics'], ['Pengaturan', '/settings']]],
      ]) {
        for (const [label, path] of links) {
          await nav.getByRole('button', { name: group, exact: true }).click();
          await page.getByRole('menuitem', { name: label, exact: true }).click();
          await page.waitForFunction(path => document.querySelector('[data-testid="route"]')?.textContent === path, path, { timeout: 5000 });
          assert.equal(await page.getByTestId('route').textContent(), path);
          await page.getByRole('menu').waitFor({ state: 'hidden' });
          await page.waitForFunction(el => getComputedStyle(el).backgroundColor === 'rgb(255, 255, 255)', await nav.getByRole('button', { name: group, exact: true }).elementHandle(), { timeout: 5000 });
          assert.equal(await nav.getByRole('button', { name: group, exact: true }).evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)');
          checks++;
        }
      }
      const trigger = nav.getByRole('button', { name: 'Absensi', exact: true });
      await trigger.focus();
      await page.keyboard.press('Enter');
      await page.getByRole('menu').waitFor();
      await page.keyboard.press('Escape');
      await page.getByRole('menu').waitFor({ state: 'hidden' });
      assert.equal(await trigger.evaluate(el => el === document.activeElement), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      checks += 2;
      if (width === 1440 && !dark) await page.screenshot({ path: `${process.env.LOCALAPPDATA}/Temp/gesit-ui-qa/hr-top-navigation.png` });
      await page.close();
    }
  }
  for (const width of [390, 768]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    await page.goto(`${base}/tests/ui/top-navigation.html`);
    assert.equal(await page.getByRole('navigation', { name: 'Navigasi utama HR' }).isVisible(), false);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    checks += 2;
    await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${base}/tests/ui/top-navigation.html?restricted`);
  const nav = page.getByRole('navigation', { name: 'Navigasi utama HR' });
  await nav.waitFor();
  assert.equal(await nav.getByRole('link').count(), 1);
  assert.equal(await nav.getByRole('button').count(), 0);
  await nav.getByRole('link', { name: 'Request & Approval' }).click();
  await page.getByTestId('route').filter({ hasText: /^\/requests$/ }).waitFor();
  assert.equal(await page.getByTestId('route').textContent(), '/requests');
  checks += 3;
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, checks, pageErrors: errors, screenshot: `${process.env.LOCALAPPDATA}/Temp/gesit-ui-qa/hr-top-navigation.png` }));
} finally {
  await browser.close();
}
