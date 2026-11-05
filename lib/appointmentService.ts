import { supabase } from './supabaseClient';

export interface PendingAppointmentSyncResult {
  activatedCount: number;
  activatedEmployees: Array<{
    id: number;
    fullName: string;
    skNumber: string;
    effectiveDate: string;
  }>;
  errors: string[];
}

/**
 * Memeriksa tabel `employee_appointments` dan menyinkronkan status karyawan
 * yang tanggal efektif pengangkatannya sudah tiba (effective_date <= hari ini).
 *
 * Mengubah:
 * - contract_type -> 'PKWTT'
 * - employment_type -> 'PKWTT'
 * - contract_end_date -> NULL
 * - status_effective_date -> appointment.effective_date
 * - pkwt_number -> appointment.sk_number
 */
export async function syncEffectiveAppointments(
  referenceDateStr?: string
): Promise<PendingAppointmentSyncResult> {
  const todayStr = referenceDateStr || new Date().toISOString().slice(0, 10);
  const result: PendingAppointmentSyncResult = {
    activatedCount: 0,
    activatedEmployees: [],
    errors: [],
  };

  try {
    // 1. Ambil semua SK pengangkatan yang effective_date sudah tercapai (<= today)
    const { data: dueAppointments, error: fetchErr } = await supabase
      .from('employee_appointments')
      .select('id, sk_number, employee_id, employee_name, effective_date, sk_file_url')
      .lte('effective_date', todayStr)
      .order('effective_date', { ascending: false });

    if (fetchErr) {
      result.errors.push(`Gagal membaca employee_appointments: ${fetchErr.message}`);
      return result;
    }

    if (!dueAppointments || dueAppointments.length === 0) {
      return result;
    }

    // Ambil mapping SK terbaru per employee_id
    const latestPerEmployee = new Map<number, (typeof dueAppointments)[0]>();
    for (const app of dueAppointments) {
      if (!app.employee_id) continue;
      if (!latestPerEmployee.has(app.employee_id)) {
        latestPerEmployee.set(app.employee_id, app);
      }
    }

    // 2. Ambil user_accounts terkait yang statusnya belum PKWTT
    const employeeIds = Array.from(latestPerEmployee.keys());
    const { data: users, error: userErr } = await supabase
      .from('user_accounts')
      .select('id, full_name, contract_type, employment_type, contract_end_date')
      .in('id', employeeIds);

    if (userErr) {
      result.errors.push(`Gagal membaca user_accounts: ${userErr.message}`);
      return result;
    }

    for (const user of users || []) {
      const cType = String(user.contract_type || '').toUpperCase();
      const eType = String(user.employment_type || '').toUpperCase();
      const isAlreadyPkwtt = (cType === 'PKWTT' || eType === 'PKWTT') && user.contract_end_date === null;

      if (isAlreadyPkwtt) continue;

      const app = latestPerEmployee.get(user.id);
      if (!app) continue;

      // Update ke PKWTT karena effective_date sudah tiba
      const { error: updErr } = await supabase
        .from('user_accounts')
        .update({
          contract_type: 'PKWTT',
          employment_type: 'PKWTT',
          contract_end_date: null,
          pkwt_number: app.sk_number,
          sk_file_url: app.sk_file_url || undefined,
          status_effective_date: app.effective_date,
        })
        .eq('id', user.id);

      if (updErr) {
        result.errors.push(`Gagal update karyawan #${user.id} (${user.full_name}): ${updErr.message}`);
      } else {
        result.activatedCount++;
        result.activatedEmployees.push({
          id: user.id,
          fullName: user.full_name || app.employee_name,
          skNumber: app.sk_number,
          effectiveDate: app.effective_date,
        });

        // Catat riwayat kontrak jika belum ada
        try {
          await supabase.from('employee_contract_history').insert({
            employee_id: user.id,
            contract_type: 'PKWTT',
            sk_number: app.sk_number,
            contract_start_date: app.effective_date,
            contract_end_date: null,
            sk_file_url: app.sk_file_url || null,
            notes: `Otomatis aktif menjadi PKWTT per tanggal efektif SK ${app.effective_date}.`,
            created_by: 'System Auto-Sync',
          });
        } catch {
          // ignore jika sudah ada / history opsional
        }
      }
    }
  } catch (err: any) {
    result.errors.push(`Unexpected error: ${err?.message || String(err)}`);
  }

  return result;
}
