import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.HR_QA_URL || 'http://127.0.0.1:3016';
const employees = Array.from({ length: 8 }, (_, i) => ({
  id: `qa-${i}`, full_name: `TEST Karyawan ${i}`, employee_code: `QA-${i}`,
  company: 'TEST Perusahaan', department: 'TEST IT', status: 'active', schedule_id: 1,
  date_of_birth: i === 7 ? null : '1990-01-01', join_date: '2020-01-01',
}));
employees[3].schedule_id = 2;
employees[4].schedule_id = 999;
employees[5].join_date = '2026-10-21';
const tables = {
  user_accounts: [...employees, { ...employees[0], id: 'system-administrator', full_name: 'Administrator', role: 'Super Admin', join_date: '2026-10-01' }],
  attendance_schedules: [
    { id: 1, name: 'Morning', work_start: '07:00', grace_period_minutes: 15, is_active: true },
    { id: 2, name: 'Middle', work_start: '10:00', grace_period_minutes: 15, is_active: true },
  ],
  attendance_settings: [{ id: 1, default_schedule_id: 1, work_days: [1, 2, 3, 4, 5] }],
  attendance_records: [
    { id: 1, user_id: 'qa-0', date: '2026-10-20', status: 'present', clock_in: '2026-10-20T00:00:00Z' },
    { id: 2, user_id: 'qa-1', date: '2026-10-20', status: 'late', clock_in: '2026-10-20T01:00:00Z' },
  ],
  leave_requests: [{ id: 1, user_id: 'qa-2', status: 'approved', start_date: '2026-10-20', end_date: '2026-10-20' }],
};
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const errors = [];
let checks = 0;
try {
  for (const width of [1440, 390]) {
    for (const dark of [false, true]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      page.on('pageerror', error => errors.push(error.message));
      await page.clock.setFixedTime(new Date('2026-10-20T01:30:00Z'));
      await page.route('https://tanggalmerah.upset.dev/**', route => route.fulfill({ json: [] }));
      let failSchedules = false;
      let failAccounts = false;
      let empty = false;
      let releaseAccounts;
      const accountsGate = new Promise(resolve => { releaseAccounts = resolve; });
      let initial = true;
      await page.route('**/rest/v1/**', async route => {
        const table = new URL(route.request().url()).pathname.split('/').at(-1);
        if (table === 'user_accounts' && initial) await accountsGate;
        if ((failSchedules && table === 'attendance_schedules') || (failAccounts && table === 'user_accounts')) {
          return route.fulfill({ status: 500, json: { message: 'TEST unavailable', code: 'TEST' } });
        }
        return route.fulfill({ json: empty ? [] : tables[table] ?? [] });
      });
      await page.goto(`${base}/tests/ui/dashboard-integration.html`);
      await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), dark);
      const activeCard = page.getByRole('button', { name: /^Lihat karyawan aktif:/ });
      await activeCard.waitFor();
      assert.equal(await activeCard.isDisabled(), true);
      assert.match(await activeCard.innerText(), /Memuat data/);
      initial = false;
      releaseAccounts();
      await page.waitForFunction(() => !document.querySelector('button[aria-label^="Lihat karyawan aktif:"]')?.disabled);
      assert.match(await page.getByRole('button', { name: /^Lihat rata-rata usia:/ }).innerText(), /7 dari 8 tanggal lahir valid · 1 belum lengkap/);
      assert.match(await activeCard.innerText(), /Perubahan bersih: \+1 orang/);
      assert.equal(await activeCard.getByText('Lihat rincian', { exact: true }).isVisible(), true);
      const attendance = page.getByRole('region', { name: 'Presensi berdasarkan jadwal' });
      assert.match(await attendance.innerText(), /2 check-in \/ 5 wajib hadir/);
      for (const [label, names] of [
        ['tepat waktu', ['TEST Karyawan 0']], ['terlambat', ['TEST Karyawan 1']],
        ['cuti / izin / sakit', ['TEST Karyawan 2']], ['masih dalam waktu masuk', ['TEST Karyawan 3']],
        ['jadwal belum lengkap', ['TEST Karyawan 4']], ['tidak dijadwalkan', ['TEST Karyawan 5']],
        ['belum check-in', ['TEST Karyawan 6', 'TEST Karyawan 7']],
      ]) {
        await attendance.getByRole('button', { name: `Lihat presensi ${label}: ${names.length} orang`, exact: true }).click();
        const dialog = page.getByRole('dialog');
        await dialog.waitFor();
        assert.deepEqual(await dialog.locator('h4').allTextContents(), names);
        await page.keyboard.press('Escape');
        await dialog.waitFor({ state: 'hidden' });
        checks++;
      }
      const company = page.getByRole('button', { name: 'Lihat perusahaan TEST Perusahaan: 8 orang', exact: true });
      await company.focus();
      await page.keyboard.press('Enter');
      await page.getByRole('dialog', { name: 'Perusahaan: TEST Perusahaan', exact: true }).waitFor();
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
      await page.getByRole('link', { name: 'Lihat semua perusahaan' }).click();
      assert.equal(await page.locator('#ringkasan-perusahaan').isVisible(), true);
      assert.match(page.url(), /#ringkasan-perusahaan$/);
      if (process.env.HR_QA_SCREENSHOTS) {
        await page.getByRole('button', { name: /^Lihat karyawan aktif:/ }).locator('..').screenshot({ path: `${process.env.HR_QA_SCREENSHOTS}/insights-${width}-${dark ? 'dark' : 'light'}.png` });
        await attendance.screenshot({ path: `${process.env.HR_QA_SCREENSHOTS}/shift-presence-${width}-${dark ? 'dark' : 'light'}.png` });
      }
      failSchedules = true;
      await page.locator('input[type="date"]').fill('2026-10-19');
      await attendance.getByRole('alert').waitFor();
      assert.match(await attendance.innerText(), /Jadwal atau kalender kerja belum berhasil dimuat/);
      assert.equal(await attendance.getByRole('button').count(), 0);
      failSchedules = false;
      empty = true;
      await page.locator('input[type="date"]').fill('2026-10-18');
      await page.getByText('Belum ada penempatan karyawan sesuai filter.', { exact: true }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      empty = false;
      failAccounts = true;
      await page.locator('input[type="date"]').fill('2026-10-17');
      await page.getByRole('button', { name: 'Muat ulang dashboard' }).waitFor();
      failAccounts = false;
      await page.getByRole('button', { name: 'Muat ulang dashboard' }).click();
      await page.getByRole('button', { name: 'Lihat karyawan aktif: 8 orang', exact: true }).waitFor();
      checks += 11;
      await page.close();
    }
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, checks, pageErrors: errors }));
} finally {
  await browser.close();
}
