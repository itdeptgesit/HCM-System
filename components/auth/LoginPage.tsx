import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Sun,
  Moon,
  HelpCircle,
  Shield,
  Clock,
  FileText
} from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient';
import { loadCurrentHRUser } from '../../lib/workforceData';
import { trackActivity } from '../../lib/auditLogger';
import { useLanguage } from '@/context/LanguageContext';
import { LanguageToggle } from '@/components/ui/LanguageToggle';

interface LoginPageProps {
  onLoginSuccess: (user: any) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const { setTheme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { t, isEn } = useLanguage();

  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem('gesit_remembered_email') || '';
    } catch {
      return '';
    }
  });
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
      setErrorMsg(t.auth.errorEmailRequired);
      return;
    }
    if (!password) {
      setErrorMsg(t.auth.errorPasswordRequired);
      return;
    }

    setLoading(true);

    try {
      const emailLower = email.trim().toLowerCase();

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: emailLower,
        password,
      });
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

      toast.success(`${t.auth.welcomeBack}, ${loggedInUser.fullName}!`);
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
        },
      }).catch(console.error);

      onLoginSuccess(loggedInUser);
      navigate('/');
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMsg(err?.message || 'Gagal masuk ke akun. Silakan periksa kembali email & kata sandi.');
      toast.error('Autentikasi gagal. Periksa kembali email dan kata sandi Anda.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/login' },
    });
    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-background text-foreground font-sans">
      {/* ── Dot Pattern Background ── */}
      <div className="pointer-events-none absolute inset-0 text-neutral-400/50 dark:text-neutral-600/30 [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(700px_circle_at_center,white,transparent)]" />

      {/* ── Top Header ── */}
      <header className="relative z-20 flex h-20 items-center justify-between px-6 lg:px-12">
        <div className="flex items-center gap-3">
          <img
            src="/image/logo.png"
            alt="The Gesit Companies"
            className="h-10 w-auto object-contain"
          />
          <div className="flex flex-col">
            <span className="font-bold tracking-tight text-foreground text-base leading-none">
              GESIT <span className="text-[#E5A83B]">People</span>
            </span>
            <span className="text-[10px] text-muted-foreground font-semibold tracking-wider uppercase mt-1">
              HCM Enterprise System
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Language Switcher (EN / ID) */}
          <LanguageToggle size="sm" />

          {/* Dark / Light Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="h-8.5 w-8.5 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
            title={isDark ? t.common.themeLight : t.common.themeDark}
          >
            {isDark ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4" />}
          </Button>

          {/* Help Button */}
          <button
            type="button"
            onClick={() => setShowHelpModal(true)}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <HelpCircle className="size-3.5" />
            <span>{t.common.hrHelp}</span>
          </button>
        </div>
      </header>

      {/* ── Main Content Area (Two-Column Nexora Template) ── */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-8">
        <div className="grid w-full max-w-5xl items-center gap-12 lg:grid-cols-[1fr_400px] lg:gap-16">
          
          {/* ── Left Hero Panel (Desktop) ── */}
          <section className="hidden lg:block">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/70 px-3.5 py-1.5 text-xs text-muted-foreground backdrop-blur-sm shadow-2xs">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              {t.auth.systemBadge}
            </div>

            <h1 className="max-w-xl text-4xl font-semibold tracking-tight xl:text-5xl leading-[1.2]">
              {t.auth.heroTitlePrefix}<span className="text-primary font-bold">{t.auth.heroTitleHighlight}</span>
            </h1>

            <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground">
              {t.auth.heroDescription}
            </p>

            {/* Feature Cards Grid */}
            <div className="mt-8 grid grid-cols-2 gap-4 max-w-lg">
              <div className="flex items-start gap-2.5 p-3 rounded-xl border border-border/60 bg-card/60 backdrop-blur-xs">
                <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-foreground">{t.auth.featureGeofencingTitle}</p>
                  <p className="text-muted-foreground text-[11px] mt-0.5">{t.auth.featureGeofencingDesc}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl border border-border/60 bg-card/60 backdrop-blur-xs">
                <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-foreground">{t.auth.featureApprovalTitle}</p>
                  <p className="text-muted-foreground text-[11px] mt-0.5">{t.auth.featureApprovalDesc}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl border border-border/60 bg-card/60 backdrop-blur-xs">
                <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-foreground">{t.auth.featureContractTitle}</p>
                  <p className="text-muted-foreground text-[11px] mt-0.5">{t.auth.featureContractDesc}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl border border-border/60 bg-card/60 backdrop-blur-xs">
                <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-foreground">{t.auth.featureSecurityTitle}</p>
                  <p className="text-muted-foreground text-[11px] mt-0.5">{t.auth.featureSecurityDesc}</p>
                </div>
              </div>
            </div>

            {/* Group Companies Badges */}
            <div className="mt-12">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t.auth.companyEntities}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  'PT Gesit Perkasa',
                  'PT Lima Sudirman Perkasa',
                  'PT Dharma Alumas Sakti',
                  'The City Tower',
                ].map((comp) => (
                  <span
                    key={comp}
                    className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-muted text-muted-foreground"
                  >
                    {comp}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* ── Right Login Card (Nexora Template) ── */}
          <div className="w-full rounded-2xl border border-border/80 bg-card/90 dark:bg-zinc-900/90 p-7 shadow-xl backdrop-blur-md sm:p-8">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">{t.auth.welcomeTitle}</h2>
            <p className="mb-6 mt-1.5 text-sm text-muted-foreground">
              {t.auth.welcomeSubtitle}
            </p>

            {/* Google SSO Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2.5 h-10 rounded-xl font-medium cursor-pointer"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <svg className="size-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              {t.auth.googleSignIn}
            </Button>

            {/* Divider */}
            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              {t.auth.orEmail}
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Login Form */}
            <form className="grid gap-4" onSubmit={handleLogin}>
              {errorMsg && (
                <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-destructive/10 border border-destructive/20 text-destructive animate-in fade-in-50">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="email">{t.auth.emailLabel}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t.auth.emailPlaceholder}
                  className="placeholder:text-zinc-600 placeholder:opacity-100 dark:placeholder:text-zinc-400"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="password">{t.auth.passwordLabel}</Label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-xs font-medium text-primary hover:underline underline-offset-4 cursor-pointer"
                  >
                    {t.auth.forgotPassword}
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t.auth.passwordPlaceholder}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10 placeholder:text-zinc-600 placeholder:opacity-100 dark:placeholder:text-zinc-400"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center gap-2 py-1">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                />
                <label htmlFor="remember" className="text-xs text-muted-foreground cursor-pointer select-none">
                  {t.auth.rememberMe}
                </label>
              </div>

              <Button type="submit" className="w-full h-10 rounded-xl font-semibold cursor-pointer" disabled={loading}>
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    <span>{t.auth.verifying}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>{t.auth.signInButton}</span>
                    <ArrowRight className="size-4" />
                  </div>
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
              {t.auth.noAccess}{' '}
              <button
                type="button"
                onClick={() => setShowHelpModal(true)}
                className="font-semibold text-foreground underline underline-offset-2 hover:text-primary cursor-pointer"
              >
                {t.auth.contactHelpdesk}
              </button>
            </p>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-20 flex flex-col items-center justify-between gap-4 px-6 pb-6 pt-4 text-xs text-muted-foreground sm:flex-row sm:px-10 lg:px-12">
        <p>
          {isEn ? 'Copyright' : 'Hak Cipta'} © {new Date().getFullYear()}{' '}
          <span className="font-medium text-foreground">The Gesit Companies</span>. {t.common.allRightsReserved}
        </p>
        <div className="flex items-center gap-5">
          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            {t.common.systemOperational}
          </span>
          <button
            type="button"
            onClick={() => setShowHelpModal(true)}
            className="transition-colors hover:text-foreground cursor-pointer"
          >
            {t.common.accessGuide}
          </button>
        </div>
      </footer>

      {/* ── MODAL: BANTUAN HR ── */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl border border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {t.auth.helpModalTitle}
                </h3>
                <p className="text-xs text-muted-foreground">{t.auth.helpModalSubtitle}</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              {t.auth.helpModalDesc}
            </p>

            <div className="space-y-2.5 rounded-xl bg-muted/50 p-3.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email HR:</span>
                <span className="font-semibold text-foreground">
                  hr.support@gesit.co.id
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">WhatsApp Hotline:</span>
                <span className="font-semibold text-foreground">
                  +62 811-9876-5432
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.auth.operatingHoursLabel}</span>
                <span className="font-semibold text-foreground">
                  {t.auth.operatingHoursValue}
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="cursor-pointer"
              >
                {t.common.close}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: LUPA KATA SANDI ── */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl border border-border">
            <h3 className="text-base font-bold text-foreground mb-2">
              Atur Ulang Kata Sandi
            </h3>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Masukkan email perusahaan Anda. Tautan pemulihan kata sandi akan dikirimkan ke email Anda.
            </p>

            <Input
              type="email"
              placeholder="nama@gesit.co.id"
              defaultValue={email}
              className="mb-4"
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForgotModal(false)}
                className="cursor-pointer"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={() => {
                  toast.success('Instruksi pemulihan kata sandi telah dikirimkan ke email.');
                  setShowForgotModal(false);
                }}
                className="cursor-pointer"
              >
                Kirim Tautan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
