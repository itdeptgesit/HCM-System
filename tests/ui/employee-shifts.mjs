import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.HR_QA_URL || 'http://127.0.0.1:3016';
const expectedLabels = [
  'Shift Pagi 1 (07:00 - 16:00)', 'Shift Pagi 2 (08:00 - 17:00)',
  'Shift Pagi 3 (09:00 - 18:00)', 'Middle Shift (10:00 - 19:00)',
];
const schedules = [
  { id: 1, name: 'Flexible', work_start: '07:00:00', work_end: '19:00:00', is_flexible: true },
  { id: 2, name: 'Old 08:30', work_start: '08:30:00', work_end: '17:30:00', is_flexible: false },
  ...[['07:00', '16:00'], ['08:00', '17:00'], ['09:00', '18:00'], ['10:00', '19:00'], ['08:00', '17:00']].map(([start, end], index) => ({
    id: index + 3, name: `TEST Shift ${index}`, work_start: `${start}:00`, work_end: `${end}:00`, is_flexible: false,
  })),
];
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const errors = [];
let checks = 0;
try {
  for (const width of [1440, 390]) {
    for (const dark of [false, true]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/rest/v1/**', route => {
        const table = new URL(route.request().url()).pathname.split('/').at(-1);
        const missing = new URL(page.url()).searchParams.has('missing');
        return route.fulfill({ json: table === 'attendance_schedules' ? (missing ? schedules.slice(0, 3) : schedules) : table === 'companies' ? [{ id: '1', name: 'TEST Perusahaan' }] : table === 'departments' ? [{ name: 'TEST IT' }] : [] });
      });
      for (const query of ['', '?legacy', '?missing']) {
        await page.goto(`${base}/tests/ui/employee-shifts.html${query}`);
        await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), dark);
        await page.getByRole('button', { name: 'Next', exact: true }).click();
        await page.getByRole('button', { name: 'Next', exact: true }).click();
        const select = page.getByLabel('Pilih Shift / Jadwal');
        await select.waitFor();
        await page.waitForFunction(() => [...document.querySelectorAll('select option')].some(option => option.textContent === 'TEST IT'));
        const labels = await select.locator('option').evaluateAll(options => options.filter(option => option.value && !option.hidden).map(option => option.textContent));
        assert.equal(labels.length, 4);
        if (query !== '?missing') assert.deepEqual(labels, expectedLabels);
        if (query === '?legacy') {
          assert.equal(await select.inputValue(), '2');
          await page.getByText('Jadwal lama tetap tersimpan.', { exact: false }).waitFor();
        }
        if (query === '?missing') {
          assert.equal(await select.locator('option:disabled').count(), 3);
          await page.getByText('Shift yang belum tersedia perlu ditambahkan', { exact: false }).waitFor();
        } else {
          for (const id of ['3', '4', '5', '6']) {
            await select.selectOption(id);
            assert.equal(await select.inputValue(), id);
            checks++;
          }
          await page.getByRole('button', { name: 'Next', exact: true }).click();
          await page.getByRole('button', { name: 'Next', exact: true }).click();
          await page.getByRole('button', { name: /Simpan|Save/ }).click();
          const output = page.getByTestId('saved');
          await page.waitForFunction(() => document.querySelector('[data-testid="saved"]').textContent !== 'null');
          const saved = JSON.parse(await output.textContent());
          assert.equal(saved.workScheduleType, 'shift');
          assert.equal(saved.scheduleId, '6');
        }
        checks += 2;
      }
      await page.close();
    }
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, checks, pageErrors: errors }));
} finally {
  await browser.close();
}
