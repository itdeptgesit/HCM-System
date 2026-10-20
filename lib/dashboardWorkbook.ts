import * as XLSX from 'xlsx';

export interface ExportSection {
  name: string;
  rows: Record<string, unknown>[];
  headers: string[];
  scope: string;
}

export function dashboardWorkbook({ sections, snapshotDate, company, department, exportedAt = new Date() }: {
  sections: ExportSection[];
  snapshotDate: string;
  company: string;
  department: string;
  exportedAt?: Date;
}) {
  const workbook = XLSX.utils.book_new();
  const append = (section: ExportSection) => {
    if (section.rows.length >= 1_048_576) throw new Error(`Sheet ${section.name} melebihi batas baris Excel. Persempit filter sebelum ekspor.`);
    const headers = Array.from(new Set([...section.headers, ...section.rows.flatMap(row => Object.keys(row))]));
    const worksheet = XLSX.utils.json_to_sheet(section.rows, { header: headers });
    worksheet['!cols'] = headers.map(header => ({
      wch: section.rows.reduce((width, row) => Math.min(50, Math.max(width, String(row[header] ?? '').length + 2)), Math.min(50, Math.max(12, header.length + 2))),
    }));
    if (headers.length > 0) worksheet['!autofilter'] = { ref: XLSX.utils.encode_range({ r: 0, c: 0 }, { r: section.rows.length, c: headers.length - 1 }) };
    XLSX.utils.book_append_sheet(workbook, worksheet, section.name);
  };
  append({
    name: '0. Cakupan Ekspor', headers: ['Sheet', 'Jumlah Baris Data', 'Cakupan'], scope: '',
    rows: [
      { Sheet: 'Tanggal snapshot', 'Jumlah Baris Data': '', Cakupan: snapshotDate },
      { Sheet: 'Filter perusahaan', 'Jumlah Baris Data': '', Cakupan: company === 'all' ? 'Semua perusahaan' : company },
      { Sheet: 'Filter departemen', 'Jumlah Baris Data': '', Cakupan: department === 'all' ? 'Semua departemen' : department },
      { Sheet: 'Waktu ekspor (WIB)', 'Jumlah Baris Data': '', Cakupan: exportedAt.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) },
      { Sheet: 'Catatan', 'Jumlah Baris Data': '', Cakupan: 'Seluruh baris yang berhasil dimuat sesuai hak akses dan filter, bukan hanya daftar teratas. Sheet kosong tetap memiliki header, tanpa baris data contoh.' },
      ...sections.map(section => ({ Sheet: section.name, 'Jumlah Baris Data': section.rows.length, Cakupan: section.scope })),
    ],
  });
  sections.forEach(append);
  return workbook;
}
