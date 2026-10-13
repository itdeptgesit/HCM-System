import { supabase } from './supabaseClient';
import { fetchAllRows } from './workforceData';

// Matches the bundled SKB calendar in app-absen/src/lib/holidays.ts.
const fallbackDates: Record<number, string[]> = {
  2025: '01-01 01-27 01-28 01-29 03-28 03-29 03-31 04-01 04-02 04-03 04-04 04-07 04-18 04-20 05-01 05-12 05-13 05-29 05-30 06-01 06-06 06-09 06-27 08-17 09-05 12-25 12-26'.split(' '),
  2026: '01-01 01-16 02-16 02-17 03-18 03-19 03-20 03-21 03-22 03-23 03-24 04-03 04-05 05-01 05-14 05-15 05-27 05-28 05-31 06-01 06-16 08-17 08-25 12-24 12-25'.split(' '),
  2027: '01-01 01-05 02-05 02-06 03-08 03-09 03-10 03-11 03-12 03-15 03-25 03-26 03-28 05-01 05-06 05-17 05-18 05-19 05-20 06-01 06-06 08-15 08-17 12-24 12-25 12-26'.split(' '),
};

export async function loadHolidayDates(start: string, end: string): Promise<Set<string>> {
  const holidays = new Set<string>();
  for (let year = Number(start.slice(0, 4)); year <= Number(end.slice(0, 4)); year++) {
    let dates: string[] = [];
    if (year === 2027) {
      // Official SKB 3 Menteri 2027 decree (No 1205/2026, No 3/2026, No 2/2026)
      dates = (fallbackDates[2027] || []).map(date => `2027-${date}`);
    } else {
      try {
        const response = await fetch(`https://tanggalmerah.upset.dev/api/holidays?year=${year}`, { signal: AbortSignal.timeout(5000), headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error('Holiday API unavailable');
        const payload = await response.json();
        const rows = Array.isArray(payload) ? payload : payload?.data || payload?.holidays || [];
        dates = rows.map((row: any) => String(row.date || row.tanggal || row.holiday_date || '').slice(0, 10)).filter((date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && date.startsWith(String(year)));
      } catch { /* Use the same bundled calendar as the employee application. */ }
      if (!dates.length) dates = (fallbackDates[year] || []).map(date => `${year}-${date}`);
    }
    dates.filter(date => date >= start && date <= end).forEach(date => holidays.add(date));
  }
  const overrides = await fetchAllRows((from, to) => supabase.from('company_holidays').select('*').gte('holiday_date', start).lte('holiday_date', end).order('id').range(from, to));
  for (const row of overrides) {
    if (row.is_active === false || row.holiday_type === 'working_day') holidays.delete(row.holiday_date);
    else holidays.add(row.holiday_date);
  }
  return holidays;
}
