import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sun,
  Moon,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Building2,
  User,
  Shield
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Toaster, toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient';
import { loadCurrentHRUser } from '../../lib/workforceData';
import { trackActivity } from '../../lib/auditLogger';

interface LoginPageProps {
  onLoginSuccess: (user: any) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim()) {
      setErrorMsg('Silakan masukkan email perusahaan Anda.');
      return;
    }
    if (!password) {
      setErrorMsg('Silakan masukkan kata sandi Anda.');
      return;
    }

    setLoading(true);

    try {
      const emailLower = email.trim().toLowerCase();

      const { error: authError } = await supabase.auth.signInWithPassword({ email: emailLower, password });
      if (authError) throw authError;
      const loggedInUser = await loadCurrentHRUser();
      if (!loggedInUser) throw new Error('Sesi login tidak tersedia.');

      if (rememberMe) {
        localStorage.setItem('gesit_user', JSON.stringify(loggedInUser));
        localStorage.setItem('gesit_remembered_email', emailLower);
      } else {
        sessionStorage.setItem('gesit_user', JSON.stringify(loggedInUser));
        localStorage.removeItem('gesit_remembered_email');
      }

      toast.success(`Selamat datang kembali, ${loggedInUser.fullName}!`);
      trackActivity({
        userId: loggedInUser.id,
        userName: loggedInUser.fullName || loggedInUser.name || loggedInUser.username,
        userRole: loggedInUser.role,
        userEmail: loggedInUser.email,
        module: 'Autentikasi',
        action: 'LOGIN',
        details: `User berhasil masuk ke sistem dengan peran "${loggedInUser.role}"`,
        metadata: {
          email: loggedInUser.email,
          role: loggedInUser.role,
          company: loggedInUser.company || '',
        }
      }).catch(console.error);

      onLoginSuccess(loggedInUser);
      navigate('/attendance/report');
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMsg(err?.message || 'Gagal masuk ke akun. Silakan coba kembali.');
      toast.error('Autentikasi gagal. Periksa kembali email dan kata sandi Anda.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/login' } });
    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#F8FAFC] text-[#0F172A] font-sans selection:bg-[#12346a] selection:text-white">
      {/* ======================================================== */}
      {/* SISI KIRI: BRANDING HERO PANEL (#12346a)                 */}
      {/* ======================================================== */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#12346a] text-white flex-col justify-between p-12 xl:p-16 overflow-hidden">
        {/* Subtle Decorative Ambient Glows and Rings */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-48 w-[600px] h-[600px] rounded-full border border-white/5 pointer-events-none" />
        <div className="absolute top-1/2 -right-24 w-[480px] h-[480px] rounded-full border border-dashed border-white/10 pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-[#B38241]/10 blur-3xl pointer-events-none" />

        {/* Top: Logo & System Title */}
        <div className="relative z-10 flex items-center gap-3">
          <img
            src="/image/logo.png"
            alt="Gesit People"
            className="h-10 w-auto object-contain"
          />
          <div>
            <div className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>GESIT</span>
              <span className="text-[#E5A83B] font-extrabold">People</span>
            </div>
            <div className="text-[10px] text-blue-200 tracking-[0.16em] uppercase font-bold">
              HCM - System
            </div>
          </div>
        </div>

        {/* Center: Hero Typography & Visual Diagram */}
        <div className="relative z-10 my-auto py-8">
          {/* Subtitle badge */}
          <div className="flex items-center gap-2 mb-6">
            <div className="w-6 h-[2px] bg-[#E5A83B]" />
            <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-blue-200/90">
              The Gesit Companies
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-[1.15] text-white">
            Great people.
            <br />
            Stronger teams.
            <br />
            <span className="text-[#E5A83B]">Better together.</span>
          </h1>

          <p className="mt-5 text-sm xl:text-base text-blue-100/80 leading-relaxed max-w-lg font-normal">
            Satu ruang untuk terhubung, berkembang, dan mengelola perjalanan setiap insan GESIT.
          </p>

          {/* Interactive Network Diagram */}
          <div className="relative mt-12 w-full max-w-md mx-auto flex items-center justify-center min-h-[200px]">
            {/* Concentric radar circle with crosshairs */}
            <div className="absolute w-56 h-56 rounded-full border border-dashed border-white/15 animate-pulse" />
            <div className="absolute w-72 h-72 rounded-full border border-white/5" />
            <div className="absolute text-blue-300/40 text-xs top-2 left-6">+</div>
            <div className="absolute text-blue-300/40 text-xs bottom-4 right-10">+</div>

            {/* Top pill: People connected */}
            <div className="absolute -top-3 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-medium text-white shadow-lg">
              <span className="h-2 w-2 rounded-full bg-[#E5A83B]" />
              <span>People connected</span>
            </div>

            {/* Diagram Center Card with avatar */}
            <div className="relative z-10 flex items-center justify-center gap-4">
              {/* Left ID Badge Card */}
              <div className="hidden sm:flex flex-col gap-1.5 p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 shadow-xl w-24">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                    <User className="w-3 h-3 text-white/80" />
                  </div>
                  <div className="w-8 h-2 rounded bg-white/20" />
                </div>
                <div className="w-14 h-1.5 rounded bg-white/20" />
              </div>

              {/* Central Glowing Profile Card */}
              <div className="relative p-4 rounded-2xl bg-white/15 backdrop-blur-xl border border-white/25 shadow-2xl flex flex-col items-center justify-center w-28 h-32 transform hover:scale-105 transition-transform duration-300">
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#E5A83B] to-[#FDE047] p-0.5 shadow-lg flex items-center justify-center">
                  <div className="w-full h-full rounded-full bg-[#12346a] flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-[#E5A83B] flex items-center justify-center text-[#12346a] font-black text-sm">
                      G
                    </div>
                  </div>
                </div>
                <div className="mt-2.5 w-12 h-2 rounded-full bg-white/40" />
                <div className="mt-1 w-8 h-1.5 rounded-full bg-white/20" />
              </div>

              {/* Right ID Badge Card */}
              <div className="hidden sm:flex flex-col gap-1.5 p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 shadow-xl w-24">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                    <User className="w-3 h-3 text-white/80" />
                  </div>
                  <div className="w-8 h-2 rounded bg-white/20" />
                </div>
                <div className="w-14 h-1.5 rounded bg-white/20" />
              </div>
            </div>

            {/* Bottom pill: Grow together */}
            <div className="absolute -bottom-3 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-medium text-white shadow-lg">
              <span className="text-[#E5A83B] text-xs">✓</span>
              <span>Grow together</span>
            </div>
          </div>
        </div>

        {/* Bottom: Quote block */}
        <div className="relative z-10 flex items-start gap-3 pt-6 border-t border-white/10">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 border border-white/15 text-xs text-[#E5A83B] font-serif font-black">
            "
          </div>
          <div>
            <div className="text-xs font-bold text-white tracking-wide">
              People first. Always.
            </div>
            <p className="text-[11px] text-blue-200/80 leading-relaxed mt-0.5">
              Karena setiap orang adalah bagian dari kemajuan.
            </p>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SISI KANAN: FORM LOGIN                                   */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-16 bg-white dark:bg-[#0B132B] transition-colors">
        {/* Top bar: Support link & Theme switcher */}
        <div className="flex items-center justify-between lg:justify-end gap-4 w-full">
          {/* Mobile Brand indicator */}
          <div className="flex items-center gap-2 lg:hidden">
            <img
              src="/image/logo.png"
              alt="Gesit People"
              className="h-7 w-auto object-contain"
            />
            <span className="text-sm font-bold text-[#12346a] dark:text-white">
              Gesit <span className="text-[#B38241]">People</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHelpModal(true)}
              className="text-xs font-medium text-[#64748B] hover:text-[#12346a] dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              Butuh bantuan?
            </button>
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={isDark ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
            >
              {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
            </button>
          </div>
        </div>

        {/* Center Container: Main Form */}
        <div className="w-full max-w-[440px] mx-auto my-auto py-8">
          {/* Eyebrow & Titles */}
          <div className="mb-8">
            <div className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#B38241]">
              WELCOME TO YOUR WORKSPACE
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F172A] dark:text-white mt-2">
              Selamat datang kembali.
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 mt-2 leading-relaxed">
              Masuk untuk mengakses ruang kerja dan layanan kepegawaian Anda.
            </p>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800/40 p-3.5 text-xs text-rose-700 dark:text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold text-[#334155] dark:text-slate-300 mb-2"
              >
                Email perusahaan
              </label>
              <div className="relative">
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@gesit.co.id"
                  required
                  autoComplete="email"
                  className="w-full h-12 rounded-xl border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-900 pl-11 pr-4 text-sm text-[#0F172A] dark:text-white placeholder-[#94A3B8] focus:border-[#12346a] focus:ring-4 focus:ring-[#12346a]/10 dark:focus:ring-blue-500/20 outline-none transition-all"
                />
                <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-[#94A3B8]" />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-[#334155] dark:text-slate-300 mb-2"
              >
                Kata sandi
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  required
                  autoComplete="current-password"
                  className="w-full h-12 rounded-xl border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-900 pl-11 pr-11 text-sm text-[#0F172A] dark:text-white placeholder-[#94A3B8] focus:border-[#12346a] focus:ring-4 focus:ring-[#12346a]/10 dark:focus:ring-blue-500/20 outline-none transition-all"
                />
                <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-[#94A3B8]" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white transition-colors"
                  title={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-[#CBD5E1] text-[#12346a] focus:ring-[#12346a]/20 cursor-pointer"
                />
                <span className="text-xs text-[#64748B] dark:text-slate-400">
                  Ingat email saya
                </span>
              </label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-xs font-medium text-[#12346a] dark:text-blue-400 hover:underline"
              >
                Lupa kata sandi?
              </button>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-4 rounded-xl bg-[#12346a] hover:bg-[#1a4382] active:bg-[#0c234b] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-[#12346a]/25 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Memverifikasi...</span>
                </div>
              ) : (
                <>
                  <span>Masuk ke workspace</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E2E8F0] dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase">
              <span className="bg-white dark:bg-[#0B132B] px-3 text-[#94A3B8] font-medium tracking-wider">
                atau gunakan akun perusahaan
              </span>
            </div>
          </div>

          {/* Google SSO Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full h-11 rounded-xl border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-[#1E293B] dark:text-white text-xs font-semibold flex items-center justify-center gap-3 transition-colors shadow-2xs cursor-pointer"
          >
            {/* Google 4-Color Icon */}
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Masuk dengan Google</span>
          </button>

          {/* Footer Contact */}
          <div className="mt-8 text-center text-xs text-[#64748B] dark:text-slate-400">
            Belum memiliki akses?{' '}
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="font-bold text-[#12346a] dark:text-blue-400 hover:underline cursor-pointer"
            >
              Hubungi HR
            </button>
          </div>
        </div>

        {/* Footer legal */}
        <div className="w-full text-center lg:text-left text-[11px] text-[#94A3B8]">
          &copy; {new Date().getFullYear()} The Gesit Companies. All rights reserved.
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL: BANTUAN & KONTAK HR                               */}
      {/* ======================================================== */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0B132B] p-6 shadow-2xl border border-[#E2E8F0] dark:border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-[#12346a]/10 flex items-center justify-center text-[#12346a]">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0F172A] dark:text-white">
                  Bantuan Akses Akun
                </h3>
                <p className="text-xs text-[#64748B]">Tim People & Culture Gesit</p>
              </div>
            </div>

            <p className="text-xs text-[#475569] dark:text-slate-300 leading-relaxed mb-4">
              Jika Anda belum memiliki kredensial login atau mengalami kendala akses ke workspace,
              silakan hubungi Helpdesk HR:
            </p>

            <div className="space-y-2.5 rounded-xl bg-[#F8FAFC] dark:bg-slate-900 p-3.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Email HR:</span>
                <span className="font-semibold text-[#0F172A] dark:text-white">
                  hr.support@gesit.co.id
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">WhatsApp Hotline:</span>
                <span className="font-semibold text-[#0F172A] dark:text-white">
                  +62 811-9876-5432
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Jam Operasional:</span>
                <span className="font-semibold text-[#0F172A] dark:text-white">
                  Senin - Jumat, 08:30 - 17:30
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="rounded-xl bg-[#12346a] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1a4382]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: LUPA KATA SANDI                                   */}
      {/* ======================================================== */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0B132B] p-6 shadow-2xl border border-[#E2E8F0] dark:border-slate-800">
            <h3 className="text-base font-bold text-[#0F172A] dark:text-white mb-2">
              Atur Ulang Kata Sandi
            </h3>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mb-4 leading-relaxed">
              Masukkan email perusahaan Anda. Tautan pemulihan kata sandi akan dikirimkan ke email Anda.
            </p>

            <input
              type="email"
              placeholder="nama@gesit.co.id"
              defaultValue={email}
              className="w-full h-11 rounded-xl border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs mb-4 outline-none focus:border-[#12346a]"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="rounded-xl border border-[#CBD5E1] px-4 py-2 text-xs font-semibold text-[#475569] hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  toast.success('Instruksi pemulihan kata sandi telah dikirimkan ke email.');
                  setShowForgotModal(false);
                }}
                className="rounded-xl bg-[#12346a] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1a4382]"
              >
                Kirim Tautan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
