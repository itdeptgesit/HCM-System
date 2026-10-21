import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from '@/components/ui/icons';

interface ApprovalRequest {
  requester_name: string;
  approver_name: string;
  leave_type: string;
  start_date: string | null;
  end_date: string | null;
  total_days: number | string | null;
  reason: string | null;
  level: number;
}

interface ApiError {
  error?: string;
  message?: string;
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const WEEKDAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const LEAVE_TYPES: Record<string, string> = {
  annual: 'Cuti Tahunan', sick: 'Cuti Sakit', personal: 'Cuti Pribadi',
  maternity: 'Cuti Melahirkan', unpaid: 'Cuti Tidak Berbayar',
  marriage_self: 'Cuti Menikah', marriage_child: 'Cuti Menikah Anak',
  circumcision_baptism: 'Cuti Khitanan / Baptisan Anak',
  family_bereavement: 'Cuti Keluarga Meninggal',
  wife_maternity: 'Cuti Istri Melahirkan / Keguguran',
};

function longDate(value?: string | null): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const date = new Date(Date.UTC(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, Number(value.slice(8, 10))));
  return `${WEEKDAYS[date.getUTCDay()]}, ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 border-b border-slate-100 py-3 text-sm last:border-0">
      <dt className="font-semibold text-slate-700">{label}</dt>
      <dd className="text-slate-600">{children}</dd>
    </div>
  );
}

export function EmailApprovalPage() {
  const token = useMemo(() => new URLSearchParams(window.location.search).get('t') || '', []);
  const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-workforce-emails`;
  const [request, setRequest] = useState<ApprovalRequest | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<'approve' | 'reject' | null>(null);
  const [decision, setDecision] = useState<'approved' | 'rejected' | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Tautan tidak lengkap. Buka email persetujuan dari HR dan klik tombolnya lagi.');
      setLoading(false);
      return;
    }
    let active = true;
    const load = async () => {
      try {
        const response = await fetch(`${endpoint}?t=${encodeURIComponent(token)}`, { headers: { Accept: 'application/json' } });
        const payload = await response.json().catch(() => null) as (ApiError & { request?: ApprovalRequest }) | null;
        if (!active) return;
        if (!response.ok || !payload?.request) {
          setError(payload?.message || 'Tautan tidak dapat dibuka. Silakan buka aplikasi GESIT People.');
          return;
        }
        setRequest(payload.request);
      } catch {
        if (active) setError('Tidak dapat menghubungi server. Periksa koneksi lalu muat ulang halaman.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [endpoint, token]);

  const decide = async (action: 'approve' | 'reject') => {
    if (!token || submitting) return;
    setSubmitting(action);
    setError('');
    try {
      const response = await fetch(`${endpoint}?t=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json().catch(() => null) as (ApiError & { decision?: 'approved' | 'rejected' }) | null;
      if (!response.ok || !payload?.decision) {
        setError(payload?.message || 'Keputusan gagal disimpan. Silakan buka aplikasi GESIT People.');
        return;
      }
      setDecision(payload.decision);
    } catch {
      setError('Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.');
    } finally {
      setSubmitting(null);
    }
  };

  const start = longDate(request?.start_date);
  const end = longDate(request?.end_date);
  const dates = start && end && start !== end ? `${start} – ${end}` : start;
  const days = Number(request?.total_days || 0) > 0 ? `${Number(request?.total_days)} hari` : '';

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10 font-sans text-slate-900">
      <div className="mx-auto max-w-xl">
        <div className="mb-5 flex items-center gap-3">
          <img src="/image/logo.png" alt="GESIT" className="h-14 w-auto" />
          <div>
            <p className="text-sm font-semibold tracking-wide text-[#12346a]">GESIT PEOPLE</p>
            <p className="text-xs text-slate-500">Persetujuan pengajuan cuti</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {loading && (
            <div role="status" className="flex items-center gap-3 py-10 text-sm text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin" /> Memeriksa tautan…
            </div>
          )}

          {!loading && decision && (
            <div className="text-center">
              <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-600" />
              <h1 className="text-xl font-bold text-slate-900">
                {decision === 'approved' ? 'Cuti disetujui' : 'Cuti ditolak'}
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Keputusan Anda sudah tercatat. Approver berikutnya dan karyawan akan menerima email sesuai alur persetujuan.
              </p>
              <a href="/requests" className="mt-6 inline-flex rounded-lg bg-[#12346a] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0d2750]">
                Buka GESIT People
              </a>
            </div>
          )}

          {!loading && !decision && error && (
            <div>
              <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900" role="alert">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <p>{error}</p>
              </div>
              <a href="/requests" className="mt-6 inline-flex text-sm font-semibold text-[#12346a] underline underline-offset-4">
                Buka GESIT People
              </a>
            </div>
          )}

          {!loading && !decision && !error && request && (
            <>
              <h1 className="text-xl font-bold text-slate-900">Konfirmasi pengajuan cuti</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Halo {request.approver_name}, konfirmasi keputusan Anda untuk pengajuan berikut. Keputusan langsung tercatat setelah tombol ditekan.
              </p>

              <dl className="mt-5">
                <DetailRow label="Karyawan">{request.requester_name}</DetailRow>
                <DetailRow label="Jenis cuti">{LEAVE_TYPES[request.leave_type] || request.leave_type || 'Cuti'}</DetailRow>
                <DetailRow label="Tanggal">{dates || '-'}</DetailRow>
                {days && <DetailRow label="Durasi">{days}</DetailRow>}
                {request.reason && <DetailRow label="Alasan">{request.reason}</DetailRow>}
                <DetailRow label="Tahap">Level {request.level}</DetailRow>
              </dl>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => decide('approve')}
                  disabled={submitting !== null}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#12346a] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0d2750] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting === 'approve' && <Loader2 className="h-4 w-4 animate-spin" />} Setujui
                </button>
                <button
                  type="button"
                  onClick={() => decide('reject')}
                  disabled={submitting !== null}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting === 'reject' && <Loader2 className="h-4 w-4 animate-spin" />} Tolak
                </button>
              </div>

              <p className="mt-5 text-xs leading-5 text-slate-500">
                Tautan ini hanya berlaku untuk tahap ini dan otomatis tidak berlaku setelah pengajuan diproses atau kedaluwarsa. Jangan teruskan tautan ini.
              </p>
            </>
          )}
        </div>

        <p className="mx-auto mt-4 max-w-xl px-2 text-xs leading-5 text-slate-500">
          Email otomatis dari GESIT HR. Jika Anda tidak merasa berhak menyetujui pengajuan ini, tutup halaman dan hubungi HR.
        </p>
      </div>
    </div>
  );
}
