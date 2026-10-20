import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import * as XLSX from 'xlsx';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.HR_QA_URL || 'http://127.0.0.1:3016';
const employees = Array.from({ length: 1007 }, (_, i) => ({
  id: `qa-${String(i).padStart(5, '0')}`, full_name: `TEST Karyawan ${i}`, employee_code: String(i).padStart(8, '0'),
  status: i < 1005 ? 'active' : 'resigned', company: `TEST Company ${i % 6}`, department: i % 2 ? 'TEST HR' : 'TEST IT',
  date_of_birth: '1990-01-01', join_date: i === 0 ? '2026-10-01' : '2020-01-01',
  separation_date: i === 1005 ? '2026-10-12' : i === 1006 ? '2026-09-12' : null,
  bank_account_number: '0001234567', schedule_id: 1, job_level: 'Staff', gender: 'female', last_education: 'S1',
  contract_end_date: i < 2 ? '2026-11-01' : null, employment_type: 'PKWTT',
  password: 'TEST NEVER EXPORT THIS FIELD',
}));
const logs = employees.slice(0, 1006).map((employee, i) => ({ id: `log-${String(i).padStart(5, '0')}`, user_id: employee.id, date: '2026-10-19', status: 'present', clock_in: '2026-10-19T01:00:00Z', total_work_minutes: 0 }));
const leaves = employees.map((employee, i) => ({ id: `leave-${String(i).padStart(5, '0')}`, user_id: employee.id, status: 'pending_level_2', start_date: '2026-11-01', end_date: '2026-11-02' }));
employees[0].role = 'Super Admin';
employees[1].role = 'Admin';
const systemAdministrator = { ...employees[0], id: 'system-administrator', full_name: 'Administrator', employee_code: 'SYSTEM-ONLY', role: 'Super Admin' };
const tables = {
  user_accounts: [...employees, systemAdministrator],
  attendance_records: [...logs, { ...logs[0], id: 'system-log', user_id: systemAdministrator.id }],
  leave_requests: [...leaves, { ...leaves[0], id: 'system-leave', user_id: systemAdministrator.id }],
  companies: Array.from({ length: 6 }, (_, i) => ({ id: i, name: `TEST Company ${i}` })),
  attendance_schedules: [{ id: 1, name: 'TEST Shift', is_active: true, work_start: '07:00', grace_period_minutes: 15 }],
  attendance_settings: [{ id: 1, default_schedule_id: 1, work_days: [1, 2, 3, 4, 5] }],
  overtime_requests: [{ id: 'ot', user_id: employees[0].id, status: 'pending' }],
  reimbursements: [{ id: 'reimb', user_id: employees[1].id, status: 'paid', amount: 0 }],
  attendance_correction_requests: [{ id: 'correction', user_id: employees[2].id, status: 'approved' }],
};
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const errors = [];
const pagesFetched = new Map();
let checks = 0;
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.setFixedTime(new Date('2026-10-20T05:00:00Z'));
  await page.route('https://tanggalmerah.upset.dev/**', route => route.fulfill({ json: [] }));
  let empty = false;
  let failSchedule = false;
  let failSecondPage = false;
  await page.route('**/rest/v1/**', route => {
    const url = new URL(route.request().url());
    const table = url.pathname.split('/').at(-1);
    if (failSchedule && table === 'attendance_schedules') return route.fulfill({ status: 500, json: { message: 'TEST missing schedule', code: 'TEST' } });
    const offset = Number(url.searchParams.get('offset') || 0);
    const limit = Number(url.searchParams.get('limit') || 1000);
    if (failSecondPage && table === 'leave_requests' && offset >= 1000) return route.fulfill({ status: 500, json: { message: 'TEST page 2 failed', code: 'TEST' } });
    if (!pagesFetched.has(table)) pagesFetched.set(table, new Set());
    pagesFetched.get(table).add(offset);
    let rows = empty ? [] : tables[table] ?? [];
    if (table === 'attendance_records') {
      const range = url.searchParams.getAll('date');
      for (const condition of range) {
        if (condition.startsWith('gte.')) rows = rows.filter(row => row.date >= condition.slice(4));
        if (condition.startsWith('lte.')) rows = rows.filter(row => row.date <= condition.slice(4));
      }
    }
    return route.fulfill({ json: rows.slice(offset, offset + limit) });
  });
  const downloadWorkbook = async label => {
    await page.getByRole('button', { name: 'Download Excel', exact: true }).click();
    const [download] = await Promise.all([
      page.waitForEvent('download'), page.getByRole('menuitem').filter({ hasText: label }).click(),
    ]);
    assert.match(download.suggestedFilename(), /\.xlsx$/);
    return XLSX.read(await readFile(await download.path()), { type: 'buffer' });
  };
  await page.goto(`${base}/tests/ui/dashboard-integration.html`);
  await page.getByRole('button', { name: 'Lihat karyawan aktif: 1005 orang', exact: true }).waitFor();
  const full = await downloadWorkbook('Laporan Keseluruhan (Full)');
  assert.equal(full.SheetNames.length, 13);
  const rows = (book, name) => XLSX.utils.sheet_to_json(book.Sheets[name]);
  for (const name of full.SheetNames) {
    assert.doesNotMatch(JSON.stringify(rows(full, name)), /system-administrator|SYSTEM-ONLY|system-log|system-leave|"Administrator"/);
  }
  assert.equal(rows(full, '2. Master Data Karyawan').length, 1005);
  assert.equal(rows(full, '12. Karyawan Nonaktif').length, 2);
  assert.equal(rows(full, '10. Karyawan Keluar').length, 1);
  assert.equal(rows(full, '9. Karyawan Masuk').length, 1);
  assert.equal(rows(full, '4. Rekap Presensi Harian').length, 1005);
  assert.ok(rows(full, '4. Rekap Presensi Harian').every(row => row['Status Kehadiran'] === 'Belum check-in'));
  assert.equal(rows(full, '5. Log Presensi Bulan').length, 1006);
  assert.equal(rows(full, '5. Log Presensi Bulan')[0]['Durasi Kerja (Menit)'], 0);
  assert.match(rows(full, '5. Log Presensi Bulan')[0]['Jam Masuk (WIB)'], /^08[.:]00$/);
  assert.equal(rows(full, '8. Ringkasan Perusahaan').length, 6);
  assert.equal(rows(full, '7. Anggota Kelompok').length, 1005 * 6);
  assert.equal(rows(full, '11. Pengajuan').length, 1010);
  const first = rows(full, '2. Master Data Karyawan')[0];
  assert.equal(first['NIK / Employee ID'], '00000000');
  assert.equal(first['Nomor Rekening'], '0001234567');
  assert.equal(first['Level / Golongan'], 'Staff');
  assert.ok(!Object.keys(first).some(key => /password|auth.*token/i.test(key)));
  const metadata = rows(full, '0. Cakupan Ekspor');
  for (const name of full.SheetNames.filter(name => name !== '0. Cakupan Ekspor')) assert.equal(metadata.find(row => row.Sheet === name)['Jumlah Baris Data'], rows(full, name).length);
  for (const table of ['user_accounts', 'attendance_records', 'leave_requests']) assert.ok(pagesFetched.get(table).has(1000), `${table}: second page not fetched`);
  checks += 21;

  await page.locator('select').nth(0).selectOption('TEST Company 0');
  await page.locator('select').nth(1).selectOption('TEST IT');
  const filtered = await downloadWorkbook('Laporan Keseluruhan (Full)');
  const expected = employees.filter(employee => employee.status === 'active' && employee.company === 'TEST Company 0' && employee.department === 'TEST IT');
  assert.equal(rows(filtered, '2. Master Data Karyawan').length, expected.length);
  assert.ok(rows(filtered, '11. Pengajuan').every(row => row.Perusahaan === 'TEST Company 0' && row.Departemen === 'TEST IT'));
  assert.ok(rows(filtered, '5. Log Presensi Bulan').every(row => row.Perusahaan === 'TEST Company 0' && row.Departemen === 'TEST IT'));
  const master = await downloadWorkbook('Master Data Karyawan');
  assert.equal(rows(master, 'Master Data Karyawan').length, expected.length);
  const contracts = await downloadWorkbook('Monitoring Jatuh Tempo Kontrak');
  assert.equal(rows(contracts, 'Jatuh Tempo Kontrak').length, 1);
  checks += 5;

  failSchedule = true;
  await page.locator('input[type="date"]').fill('2026-10-18');
  await page.getByRole('region', { name: 'Presensi berdasarkan jadwal' }).getByRole('alert').waitFor();
  let downloads = 0;
  page.on('download', () => downloads++);
  await page.getByRole('button', { name: 'Download Excel', exact: true }).click();
  await page.getByRole('menuitem').filter({ hasText: 'Laporan Keseluruhan (Full)' }).click();
  await page.getByText(/Ekspor lengkap dibatalkan/, { exact: false }).waitFor();
  assert.equal(downloads, 0);
  failSchedule = false;
  empty = true;
  await page.locator('input[type="date"]').fill('2026-10-17');
  await page.getByRole('button', { name: 'Lihat karyawan aktif: 0 orang', exact: true }).waitFor();
  const emptyBook = await downloadWorkbook('Laporan Keseluruhan (Full)');
  assert.equal(rows(emptyBook, '2. Master Data Karyawan').length, 0);
  assert.equal(rows(emptyBook, '3. Evaluasi Kontrak PKWT').length, 0);
  assert.equal(rows(emptyBook, '4. Rekap Presensi Harian').length, 0);
  assert.equal(rows(emptyBook, '11. Pengajuan').length, 0);
  assert.equal(emptyBook.Sheets['2. Master Data Karyawan'].A1.v, 'No');
  checks += 6;
  empty = false;
  failSecondPage = true;
  await page.locator('input[type="date"]').fill('2026-10-16');
  await page.getByRole('button', { name: 'Muat ulang dashboard', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Download Excel', exact: true }).count(), 0);
  failSecondPage = false;
  await page.getByRole('button', { name: 'Muat ulang dashboard', exact: true }).click();
  await page.getByRole('button', { name: 'Download Excel', exact: true }).waitFor();
  const retried = await downloadWorkbook('Laporan Keseluruhan (Full)');
  assert.ok(rows(retried, '11. Pengajuan').length > 0);
  checks += 3;
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, checks, sheets: full.SheetNames.length, activeEmployees: 1005, pageErrors: errors }));
} finally {
  await browser.close();
}
