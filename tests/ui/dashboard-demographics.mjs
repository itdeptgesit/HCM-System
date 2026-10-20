import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.HR_QA_URL || 'http://127.0.0.1:3016';
const ageGroups = ['<25 tahun', '25–<30 tahun', '30–<40 tahun', '40–<50 tahun', '50–<60 tahun', '≥60 tahun', 'Belum tercatat'];
const educationGroups = ['SMA / SMK', 'Diploma', 'S1', 'S2', 'S3', 'Belum tercatat', 'Lainnya'];
const tenureGroups = ['<1 tahun', '1–3 tahun', '3–5 tahun', '5–10 tahun', '≥10 tahun', 'Belum tercatat'];
const ages = [24, 25, 29, 30, 39, 40, 49, 50, 59, 60, null];
const education = ['SMK', 'D3', 'S1', 'S2 / Magister Sarjana', '', 'SMA', 'Diploma', 'Bachelor', 'Master', 'SMP', null];
const joinDates = ['2026-04-20', '2024-10-20', '2022-10-20', '2019-10-20', '2015-10-20', null];
const employees = ages.map((age, i) => ({
  id: `test-${i}`, full_name: `TEST Karyawan ${i}`, employee_code: `QA-${i}`,
  date_of_birth: age === null ? null : `${2026 - age}-10-20`,
  last_education: education[i], join_date: i === 0 ? '2026-10-01' : joinDates[i % joinDates.length],
  contract_end_date: ['2026-10-20', '2026-11-19', '2026-11-20', '2026-10-19'][i] || null,
  contract_type: ['PKWTT', 'PKWT', 'Probation', 'Intern', 'Permanent', 'Contract', 'Percobaan', 'Tetap', 'Magang', 'PKWTT', 'PKWTT'][i],
  gender: ['male', 'female', 'laki-laki', 'Perempuan', '', 'pria', 'wanita', 'M', 'F', null, 'Laki-laki'][i],
  company: 'TEST Perusahaan A', department: i % 2 ? 'TEST HR' : 'TEST IT',
  job_title: 'TEST Jabatan', status: 'active',
}));
const fixtures = [
  ...employees,
  { ...employees[0], id: 'inactive', full_name: 'TEST Nonaktif', status: 'inactive', separation_date: '2026-10-12' },
  { ...employees[0], id: 'previous-exit', full_name: 'TEST Keluar September', status: 'resigned', join_date: '2025-10-01', separation_date: '2026-09-12' },
  { ...employees[0], id: 'other-exit', full_name: 'TEST Keluar Perusahaan B', company: 'TEST Perusahaan B', status: 'resigned', separation_date: '2026-10-12' },
  { ...employees[0], id: 'other-company', full_name: 'TEST Perusahaan B', company: 'TEST Perusahaan B' },
];
const expected = {
  Usia: [[0], [1, 2], [3, 4], [5, 6], [7, 8], [9], [10]],
  'Pendidikan terakhir': [[0, 5], [1, 6], [2, 7], [3, 8], [], [4, 10], [9]],
  'Masa kerja': [[0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5]],
  Departemen: [[0, 2, 4, 6, 8, 10], [1, 3, 5, 7, 9]],
  'Status kepegawaian': [[0, 4, 7, 9, 10], [1, 5], [2, 6], [3, 8]],
  Gender: [[0, 2, 5, 7, 10], [1, 3, 6, 8], [4, 9]],
};

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const errors = [];
let checks = 0;
try {
  for (const width of [1440, 390]) {
    for (const dark of [false, true]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      page.on('pageerror', error => errors.push(error.message));
      await page.clock.setFixedTime(new Date('2026-10-20T05:00:00Z'));
      await page.route('https://tanggalmerah.upset.dev/**', route => route.fulfill({ json: [] }));
      await page.route('**/rest/v1/**', async route => {
        const table = new URL(route.request().url()).pathname.split('/').at(-1);
        const data = table === 'user_accounts' ? fixtures : [];
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
      });
      await page.goto(`${base}/tests/ui/dashboard-integration.html`);
      await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), dark);
      await page.getByRole('button', { name: 'Lihat karyawan usia <25 tahun: 2 orang', exact: true }).waitFor();
      await page.locator('select').nth(0).selectOption('TEST Perusahaan A');

      const checkSummaryCards = async (department) => {
        const active = employees.filter(emp => !department || emp.department === department);
        for (const [label, title, names] of [
          ['Lihat karyawan aktif:', 'Karyawan aktif', active.map(emp => emp.full_name)],
          ['Lihat rata-rata usia:', 'Rata-rata usia', active.filter(emp => emp.date_of_birth).map(emp => emp.full_name)],
          ['Lihat rata-rata masa kerja:', 'Rata-rata masa kerja', active.filter(emp => emp.join_date).map(emp => emp.full_name)],
          ['Lihat turnover bulan berjalan:', 'Turnover bulan berjalan', department === 'TEST HR' ? [] : ['TEST Nonaktif']],
        ]) {
          const card = page.getByRole('button', { name: new RegExp(`^${label}`) });
          assert.equal(await card.getAttribute('aria-label'), `${label} ${names.length} orang`);
          await card.click();
          const dialog = page.getByRole('dialog', { name: `Ringkasan SDM: ${title}`, exact: true });
          await dialog.waitFor();
          assert.deepEqual(await dialog.locator('h4').allTextContents(), names);
          if (title === 'Turnover bulan berjalan') {
            assert.match(await dialog.innerText(), /Karyawan keluar pada Oktober 2026/);
            assert.doesNotMatch(await dialog.innerText(), /Daftar karyawan aktif/);
          }
          if (names.length && title !== 'Karyawan aktif') {
            const dateLabels = { 'Rata-rata usia': 'Tanggal lahir:', 'Rata-rata masa kerja': 'Tanggal masuk:', 'Turnover bulan berjalan': 'Tanggal keluar:' };
            assert.equal(await dialog.getByText(dateLabels[title], { exact: false }).count(), names.length);
          }
          if (!names.length) assert.equal(await dialog.getByText('Belum ada karyawan dalam kelompok ini.').isVisible(), true);
          await page.keyboard.press('Escape');
          await dialog.waitFor({ state: 'hidden' });
          assert.equal(await card.evaluate(el => document.activeElement === el), true);
          await page.keyboard.press('Enter');
          await dialog.waitFor();
          await dialog.getByRole('button', { name: 'Tutup', exact: true }).click();
          await dialog.waitFor({ state: 'hidden' });
          checks++;
        }
      };
      await checkSummaryCards();
      assert.match(await page.getByRole('button', { name: /^Lihat rata-rata usia:/ }).innerText(), /40,5\s*tahun/);
      assert.match(await page.getByRole('button', { name: /^Lihat rata-rata masa kerja:/ }).innerText(), /4,9\s*tahun/);
      assert.match(await page.getByRole('button', { name: /^Lihat turnover bulan berjalan:/ }).innerText(), /8,3\s*%/);
      assert.equal(await page.getByRole('button', { name: /^Lihat masuk bulan ini:/ }).count(), 0);
      checks += 4;
      if (process.env.HR_QA_SCREENSHOTS) {
        await page.getByRole('button', { name: /^Lihat karyawan aktif:/ }).locator('..').screenshot({
          path: `${process.env.HR_QA_SCREENSHOTS}/summary-${width}-${dark ? 'dark' : 'light'}.png`,
        });
      }

      for (const [category, prefix, groups] of [
        ['Usia', 'usia', ageGroups],
        ['Pendidikan terakhir', 'pendidikan', educationGroups],
        ['Masa kerja', 'masa kerja', tenureGroups],
        ['Departemen', 'departemen', ['TEST IT', 'TEST HR']],
        ['Status kepegawaian', 'status', ['PKWTT', 'PKWT', 'Probation', 'Magang']],
        ['Gender', 'gender', ['Laki-laki', 'Perempuan', 'Belum diisi']],
      ]) {
        for (const [index, label] of groups.entries()) {
          const ids = expected[category][index];
          const trigger = page.getByRole('button', { name: `Lihat karyawan ${prefix} ${label}: ${ids.length} orang`, exact: true });
          await trigger.click();
          const dialog = page.getByRole('dialog', { name: `${category}: ${label}`, exact: true });
          await dialog.waitFor();
          assert.deepEqual(await dialog.locator('h4').allTextContents(), ids.map(id => employees[id].full_name));
          assert.match(await dialog.innerText(), new RegExp(`Menampilkan ${ids.length} dari ${ids.length} karyawan`));
          if (!ids.length) assert.equal(await dialog.getByText('Belum ada karyawan dalam kelompok ini.').isVisible(), true);
          await page.keyboard.press('Escape');
          await dialog.waitFor({ state: 'hidden' });
          assert.equal(await trigger.evaluate(el => document.activeElement === el), true);
          if (['Departemen', 'Status kepegawaian', 'Gender'].includes(category)) {
            await page.keyboard.press('Space');
            await dialog.waitFor();
            await dialog.getByRole('button', { name: 'Tutup', exact: true }).click();
            await dialog.waitFor({ state: 'hidden' });
          }
          checks++;
        }
      }
      if (process.env.HR_QA_SCREENSHOTS) {
        await page.getByRole('button', { name: /^Lihat karyawan departemen TEST IT:/ }).locator('../../../..').screenshot({
          path: `${process.env.HR_QA_SCREENSHOTS}/organization-${width}-${dark ? 'dark' : 'light'}.png`,
        });
      }

      // Search stays inside the selected group; closing restores keyboard focus.
      const trigger = page.getByRole('button', { name: 'Lihat karyawan usia 25–<30 tahun: 2 orang', exact: true });
      await trigger.focus();
      await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog');
      const search = dialog.getByRole('textbox', { name: 'Cari karyawan dalam kelompok' });
      await search.fill('QA-1');
      assert.deepEqual(await dialog.locator('h4').allTextContents(), ['TEST Karyawan 1']);
      await search.fill('QA-0');
      assert.equal(await dialog.locator('h4').count(), 0);
      await search.fill('');
      assert.equal(await dialog.locator('h4').count(), 2);
      assert.equal(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth), true);
      const box = await dialog.boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= width && box.y >= 0 && box.y + box.height <= 900);
      for (let i = 0; i < 8; i++) {
        await page.keyboard.press('Tab');
        assert.equal(await dialog.evaluate(el => el.contains(document.activeElement)), true);
      }
      if (process.env.HR_QA_SCREENSHOTS) {
        await page.screenshot({ path: `${process.env.HR_QA_SCREENSHOTS}/demographics-${width}-${dark ? 'dark' : 'light'}.png` });
      }
      await dialog.getByRole('button', { name: 'Tutup', exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });
      await trigger.focus();
      await page.keyboard.press('Space');
      await dialog.waitFor();
      await dialog.getByRole('button', { name: 'Tutup daftar karyawan', exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });
      checks += 7;

      await page.locator('select').nth(1).selectOption('TEST IT');
      await page.getByRole('button', { name: 'Lihat karyawan usia 25–<30 tahun: 1 orang', exact: true }).click();
      assert.deepEqual(await page.getByRole('dialog').locator('h4').allTextContents(), ['TEST Karyawan 2']);
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      checks += 2;
      await checkSummaryCards('TEST IT');
      await page.locator('select').nth(1).selectOption('TEST HR');
      await checkSummaryCards('TEST HR');
      for (const [label, names] of [
        ['Lihat karyawan status PKWT: 2 orang', ['TEST Karyawan 1', 'TEST Karyawan 5']],
        ['Lihat karyawan gender Perempuan: 2 orang', ['TEST Karyawan 1', 'TEST Karyawan 3']],
      ]) {
        await page.getByRole('button', { name: label, exact: true }).click();
        const filteredDialog = page.getByRole('dialog');
        await filteredDialog.waitFor();
        assert.deepEqual(await filteredDialog.locator('h4').allTextContents(), names);
        await page.keyboard.press('Escape');
        await filteredDialog.waitFor({ state: 'hidden' });
        checks++;
      }
      await page.locator('select').nth(1).selectOption('all');
      await page.locator('input[type="date"]').fill('2026-09-20');
      await page.getByRole('button', { name: 'Lihat turnover bulan berjalan: 1 orang', exact: true }).click();
      const exits = page.getByRole('dialog', { name: 'Ringkasan SDM: Turnover bulan berjalan', exact: true });
      assert.deepEqual(await exits.locator('h4').allTextContents(), ['TEST Keluar September']);
      assert.match(await exits.innerText(), /September 2026/);
      checks++;
      await page.close();
    }
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, checks, pageErrors: errors }));
} finally {
  await browser.close();
}
