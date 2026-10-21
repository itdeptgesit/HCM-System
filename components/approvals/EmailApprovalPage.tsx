import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  action: 'approve' | 'reject';
}

interface ApiError {
  error?: string;
  code?: string;
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
  const [submitting, setSubmitting] = useState(false);
  const [decision, setDecision] = useState<'approved' | 'rejected' | null>(null);
  const [errorCode, setErrorCode] = useState('');
  const started = useRef(false);

  const decide = async (action: 'approve' | 'reject') => {
    if (!token || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`${endpoint}?t=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json().catch(() => null) as (ApiError & { decision?: 'approved' | 'rejected' }) | null;
      if (!response.ok || !payload?.decision) {
        setErrorCode(payload?.code || '');
        setError(payload?.message || 'Keputusan gagal disimpan. Silakan buka aplikasi GESIT People.');
        return;
      }
      setDecision(payload.decision);
    } catch {
      setError('Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

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

  // One-click from email: the token names the decision, so record it as soon as
  // the details are validated. The mutation is a POST, so mail link scanners
  // that only fetch the page cannot approve anything.
  useEffect(() => {
    if (!request?.action || started.current) return;
    started.current = true;
    void decide(request.action);
  }, [request]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = longDate(request?.start_date);
  const end = longDate(request?.end_date);
  const dates = start && end && start !== end ? `${start} – ${end}` : start;
  const days = Number(request?.total_days || 0) > 0 ? `${Number(request?.total_days)} hari` : '';

  const details = request ? (
    <dl className="mt-5 text-left">
      <DetailRow label="Karyawan">{request.requester_name}</DetailRow>
      <DetailRow label="Jenis cuti">{LEAVE_TYPES[request.leave_type] || request.leave_type || 'Cuti'}</DetailRow>
      <DetailRow label="Tanggal">{dates || '-'}</DetailRow>
      {days && <DetailRow label="Durasi">{days}</DetailRow>}
      {request.reason && <DetailRow label="Alasan">{request.reason}</DetailRow>}
      <DetailRow label="Tahap">Level {request.level}</DetailRow>
    </dl>
  ) : null;

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
                Cuti {decision === 'approved' ? 'disetujui' : 'ditolak'}
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Keputusan Anda sudah tercatat. Approver berikutnya dan karyawan akan menerima email sesuai alur persetujuan.
              </p>
              {details}
              <a href="/requests" className="mt-6 inline-flex rounded-lg bg-[#12346a] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0d2750]">
                Buka GESIT People
              </a>
            </div>
          )}

          {!loading && !decision && error && (
            <div>
              <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900" role="alert">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p>{error}</p>
                  {errorCode && <p className="mt-1 font-mono text-xs text-amber-700">Kode: {errorCode}</p>}
                </div>
              </div>
              {request?.action && (
                <button
                  type="button"
                  onClick={() => decide(request.action)}
                  disabled={submitting}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#12346a] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0d2750] disabled:opacity-60"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Coba lagi
                </button>
              )}
              <a href="/requests" className="mt-5 ml-4 inline-flex text-sm font-semibold text-[#12346a] underline underline-offset-4">
                Buka GESIT People
              </a>
            </div>
          )}

          {!loading && !decision && !error && request && (
            <div className="text-center">
              <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-[#12346a]" />
              <h1 className="text-lg font-bold text-slate-900">
                {request.action === 'approve' ? 'Menyetujui pengajuan…' : 'Menolak pengajuan…'}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Keputusan untuk {request.requester_name} sedang disimpan.
              </p>
              {details}
              <p className="mt-5 text-xs leading-5 text-slate-500">
                Jangan tutup halaman ini sampai proses selesai.
              </p>
            </div>
          )}
        </div>

        <p className="mx-auto mt-4 max-w-xl px-2 text-xs leading-5 text-slate-500">
          Email otomatis dari GESIT HR. Tautan hanya berlaku sekali untuk tahap ini. Jika Anda tidak merasa berhak memutuskan pengajuan ini, tutup halaman dan hubungi HR.
        </p>
      </div>
    </div>
  );
}
