import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.HR_QA_URL || 'http://127.0.0.1:3016';
const users = Array.from({ length: 30 }, (_, i) => ({
  id: `qa-${i}`, full_name: `TEST Karyawan ${String(i).padStart(2, '0')}`,
  employee_code: `TEST-${i}`, status: 'active', employment_type: 'PKWTT',
  company: 'TEST Perusahaan Dengan Nama Panjang', department: 'TEST Finance & Accounting',
  job_title: 'TEST Manager - Property Management, Finance & Admin',
}));
const records = users.map((user, i) => ({
  id: i + 1, user_id: user.id, date: '2026-10-19', status: 'present',
  clock_in: '2026-10-19T01:00:00Z', clock_out: '2026-10-19T10:00:00Z',
  total_work_minutes: 540, total_overtime_minutes: 0,
  clock_in_office_name: 'TEST Kantor Pusat Dengan Nama Panjang',
  clock_out_office_name: 'TEST Kantor Pusat Dengan Nama Panjang',
}));
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const errors = [];
let checks = 0;
try {
  for (const width of [1920, 1440, 1024, 390]) {
    for (const dark of [false, true]) {
      const page = await browser.newPage({ viewport: { width, height: 920 } });
      page.on('pageerror', error => errors.push(error.message));
      await page.clock.setFixedTime(new Date('2026-10-20T05:00:00Z'));
      await page.route('https://tanggalmerah.upset.dev/**', route => route.fulfill({ json: [] }));
      await page.route('**/rest/v1/**', route => {
        const table = new URL(route.request().url()).pathname.split('/').at(-1);
        return route.fulfill({ json: table === 'user_accounts' ? users : table === 'attendance_records' ? records : [] });
      });
      await page.goto(`${base}/tests/ui/attendance-report.html`);
      await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), dark);
      const table = page.locator('table').first();
      await table.getByText('TEST Karyawan 00', { exact: true }).waitFor();
      const measure = await table.evaluate(el => {
        const scroll = el.parentElement;
        const card = el.closest('[data-slot="card"]');
        const main = document.querySelector('main main');
        return { scrollWidth: scroll.scrollWidth, clientWidth: scroll.clientWidth, cardWidth: card.clientWidth, mainWidth: main.clientWidth, mainScrollWidth: main.scrollWidth };
      });
      assert.ok(measure.clientWidth <= measure.cardWidth, JSON.stringify({ width, ...measure }));
      assert.ok(measure.mainScrollWidth <= measure.mainWidth + 1, `Report causes page-level horizontal clipping: ${JSON.stringify({ width, ...measure })}`);
      const scroll = table.locator('..');
      const scrollSize = await scroll.evaluate(el => ({ height: el.clientHeight, contentHeight: el.scrollHeight }));
      assert.ok(scrollSize.height <= 920 * 0.7, `Table scrollbar is buried below the employee list: ${JSON.stringify(scrollSize)}`);
      assert.ok(scrollSize.contentHeight > scrollSize.height, 'Long reports must scroll inside the table region');
      assert.equal(await scroll.getAttribute('tabindex'), '0');
      await scroll.scrollIntoViewIfNeeded();
      await scroll.focus();
      if (await scroll.evaluate(el => el.scrollWidth > el.clientWidth)) {
        await page.keyboard.press('ArrowRight');
        await page.waitForFunction(() => document.querySelector('[data-slot="table-container"]').scrollLeft > 0);
      }
      await scroll.evaluate(el => { el.scrollLeft = el.scrollWidth; });
      const lastHeader = table.locator('thead th').last();
      const contained = await lastHeader.evaluate(el => {
        const cell = el.getBoundingClientRect();
        const area = el.closest('[data-slot="table-container"]').getBoundingClientRect();
        return cell.right <= area.right + 1;
      });
      assert.ok(contained, 'Last column cannot be reached');
      await scroll.evaluate(el => { el.scrollTop = el.scrollHeight; });
      const stickyHeaderVisible = await lastHeader.evaluate(el => {
        const cell = el.getBoundingClientRect();
        const area = el.closest('[data-slot="table-container"]').getBoundingClientRect();
        return cell.top >= area.top - 1 && cell.bottom <= area.bottom;
      });
      assert.ok(stickyHeaderVisible, 'Column headers must remain visible while scrolling vertically');
      await scroll.evaluate(el => { el.scrollTop = 0; });
      await table.getByRole('button', { name: '1 Log', exact: true }).first().click();
      await page.getByText('Riwayat Absensi: TEST Karyawan 00', { exact: true }).waitFor();
      await table.getByRole('button', { name: '1 Log', exact: true }).first().click();
      if (process.env.HR_QA_SCREENSHOTS) {
        await scroll.screenshot({ path: `${process.env.HR_QA_SCREENSHOTS}/attendance-report-${width}-${dark ? 'dark' : 'light'}.png` });
      }
      await page.getByRole('tab', { name: 'Log Harian Lengkap' }).click();
      await page.getByText('Seluruh Log Harian Terverifikasi', { exact: true }).waitFor();
      const logScroll = page.locator('table').first().locator('..');
      await logScroll.evaluate(el => { el.scrollLeft = el.scrollWidth; el.scrollTop = el.scrollHeight; });
      assert.ok(await logScroll.evaluate(el => el.clientHeight <= 920 * 0.7 && el.scrollHeight > el.clientHeight));
      assert.equal(await page.locator('main').last().evaluate(el => el.scrollWidth <= el.clientWidth + 1), true);
      await page.getByRole('tab', { name: 'Rekapitulasi Karyawan' }).click();
      await page.getByPlaceholder('Nama, NIK, jabatan...').fill('NO_MATCH_TEST');
      await page.getByText('Tidak ada data karyawan yang cocok', { exact: true }).waitFor();
      checks += 9;
      await page.close();
    }
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, checks, pageErrors: errors }));
} finally {
  await browser.close();
}
