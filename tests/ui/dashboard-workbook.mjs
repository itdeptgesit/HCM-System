import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { dashboardWorkbook } from '../../lib/dashboardWorkbook.ts';

const rows = Array.from({ length: 1005 }, (_, id) => ({ ID: String(id).padStart(8, '0'), Name: `TEST ${id}`, Zero: 0 }));
const workbook = dashboardWorkbook({
  snapshotDate: '2026-10-20', company: 'TEST Company', department: 'all',
  sections: [
    { name: 'Employees', rows, headers: ['ID', 'Name', 'Zero'], scope: 'TEST scope' },
    { name: 'Empty', rows: [], headers: ['ID', 'Name'], scope: 'No data' },
  ],
});
const roundtrip = XLSX.read(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }), { type: 'buffer' });
const data = XLSX.utils.sheet_to_json(roundtrip.Sheets.Employees);
assert.equal(data.length, 1005);
assert.equal(data.at(-1).ID, '00001004');
assert.equal(data[0].Zero, 0);
assert.equal(roundtrip.Sheets.Employees.A2.t, 's');
assert.deepEqual(XLSX.utils.sheet_to_json(roundtrip.Sheets.Empty), []);
assert.equal(roundtrip.Sheets.Empty.A1.v, 'ID');
assert.equal(roundtrip.Sheets.Empty.B1.v, 'Name');
const metadata = XLSX.utils.sheet_to_json(roundtrip.Sheets['0. Cakupan Ekspor']);
assert.equal(metadata.find(row => row.Sheet === 'Employees')['Jumlah Baris Data'], 1005);
assert.equal(metadata.find(row => row.Sheet === 'Empty')['Jumlah Baris Data'], 0);
assert.equal(metadata.find(row => row.Sheet === 'Filter perusahaan').Cakupan, 'TEST Company');
console.log('PASS: 1005 rows, leading-zero IDs as text, zero values preserved, empty sheet headers, metadata row counts, filters, XLSX round trip.');
