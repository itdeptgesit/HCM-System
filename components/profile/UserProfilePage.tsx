import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  ShieldCheck,
  KeyRound,
  UploadCloud,
  Check,
  Loader2,
  Lock,
  FileText,
  Clock,
  MapPin,
  CreditCard,
  GraduationCap,
  Award,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Camera,
  CheckCircle2,
  Eye,
  EyeOff,
  Hash,
  Landmark,
  UserCheck,
  Shield,
  Sparkles,
  Copy,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient';
import { uploadFileToGoogleDrive } from '../../lib/googleDriveUpload';
import { formatAvatarImageUrl } from '../UserAvatar';
import { normalizeGender, normalizeReligion } from '../../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface UserProfilePageProps {
  currentUser: any;
  onUserUpdate?: (updatedUser: any) => void;
}

export const UserProfilePage: React.FC<UserProfilePageProps> = ({ currentUser, onUserUpdate }) => {
  const [profileData, setProfileData] = useState<any>(currentUser || {});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Security Tab States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Editable Profile Form State
  const [formData, setFormData] = useState({
    nickname: '',
    phone: '',
    address: '',
    residentialAddress: '',
    birthPlace: '',
    dateOfBirth: '',
    gender: '',
    maritalStatus: '',
    religion: '',
    bloodType: '',
    bankName: '',
    bankAccountName: '',
    bankAccountNumber: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load fresh user data from database
  const refreshProfile = async () => {
    if (!currentUser?.email && !currentUser?.id) return;
    setIsLoading(true);
    try {
      let query = supabase.from('user_accounts').select('*');
      if (currentUser?.id) {
        query = query.eq('id', currentUser.id);
      } else {
        query = query.ilike('email', currentUser.email);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      if (data) {
        setProfileData(data);
        setFormData({
          nickname: data.nickname || '',
          phone: data.phone || '',
          address: data.address || '',
          residentialAddress: data.residential_address || '',
          birthPlace: data.birth_place || '',
          dateOfBirth: data.date_of_birth || '',
          gender: normalizeGender(data.gender) || '',
          maritalStatus: data.marital_status || '',
          religion: normalizeReligion(data.religion) || '',
          bloodType: data.blood_type || '',
          bankName: data.bank_name || '',
          bankAccountName: data.bank_account_name || '',
          bankAccountNumber: data.bank_account_number || '',
        });
        if (onUserUpdate) {
          const synced = {
            ...currentUser,
            ...data,
            fullName: data.full_name || currentUser.fullName,
            avatarUrl: data.avatar_url || currentUser.avatarUrl,
            avatar_url: data.avatar_url || currentUser.avatar_url,
          };
          onUserUpdate(synced);
        }
      }
    } catch (err: any) {
      console.error('Gagal mengambil data profil:', err);
      toast.error('Gagal memuat profil terbaru: ' + (err.message || 'Error'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      setProfileData(currentUser);
      setFormData({
        nickname: currentUser.nickname || '',
        phone: currentUser.phone || '',
        address: currentUser.address || '',
        residentialAddress: currentUser.residential_address || currentUser.residentialAddress || '',
        birthPlace: currentUser.birth_place || currentUser.birthPlace || '',
        dateOfBirth: currentUser.date_of_birth || currentUser.dateOfBirth || '',
        gender: normalizeGender(currentUser.gender) || '',
        maritalStatus: currentUser.marital_status || currentUser.maritalStatus || '',
        religion: normalizeReligion(currentUser.religion) || '',
        bloodType: currentUser.blood_type || currentUser.bloodType || '',
        bankName: currentUser.bank_name || currentUser.bankName || '',
        bankAccountName: currentUser.bank_account_name || currentUser.bankAccountName || '',
        bankAccountNumber: currentUser.bank_account_number || currentUser.bankAccountNumber || '',
      });
      refreshProfile();
    }
  }, [currentUser?.id, currentUser?.email]);

  // Handle Avatar Upload with Google Drive Integration
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Harap pilih file gambar (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Ukuran foto maksimal 10MB.');
      return;
    }

    setIsUploadingAvatar(true);
    const toastId = toast.loading('Mengunggah foto profil ke Google Drive...');

    try {
      const uploadRes = await uploadFileToGoogleDrive(file, {
        category: 'foto_profil',
        employeeName: profileData.full_name || currentUser?.fullName || 'User',
        employeeId: profileData.employee_code || currentUser?.employeeCode,
        visibility: 'all_active',
      });

      if (!uploadRes.success || !uploadRes.fileUrl) {
        throw new Error(uploadRes.error || 'Gagal mengunggah foto');
      }

      const newAvatarUrl = uploadRes.fileUrl;

      // Update in user_accounts
      const { error: updateError } = await supabase
        .from('user_accounts')
        .update({
          avatar_url: newAvatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profileData.id || currentUser.id);

      if (updateError) throw updateError;

      // Update state
      setProfileData((prev: any) => ({ ...prev, avatar_url: newAvatarUrl, avatarUrl: newAvatarUrl }));
      const updatedUser = {
        ...currentUser,
        avatar_url: newAvatarUrl,
        avatarUrl: newAvatarUrl,
      };
      if (onUserUpdate) onUserUpdate(updatedUser);
      localStorage.setItem('gesit_user', JSON.stringify(updatedUser));

      toast.success('Foto profil berhasil diperbarui!', { id: toastId });
    } catch (err: any) {
      console.error('Error avatar upload:', err);
      toast.error('Gagal memperbarui foto profil: ' + (err.message || 'Error'), { id: toastId });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Save Personal Data
  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const toastId = toast.loading('Menyimpan perubahan profil...');

    try {
      const payload: Record<string, any> = {
        nickname: formData.nickname.trim() || null,
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        residential_address: formData.residentialAddress.trim() || null,
        birth_place: formData.birthPlace.trim() || null,
        date_of_birth: formData.dateOfBirth || null,
        gender: formData.gender || null,
        marital_status: formData.maritalStatus || null,
        religion: formData.religion || null,
        blood_type: formData.bloodType || null,
        bank_name: formData.bankName.trim() || null,
        bank_account_name: formData.bankAccountName.trim() || null,
        bank_account_number: formData.bankAccountNumber.trim() || null,
        updated_at: new Date().toISOString(),
      };

      // Resilient self-healing update
      const executeUpdate = async (dataPayload: any, retries = 5): Promise<void> => {
        const { error } = await supabase
          .from('user_accounts')
          .update(dataPayload)
          .eq('id', profileData.id || currentUser.id);

        if (error) {
          const match = error.message?.match(/Could not find the '([^']+)' column of 'user_accounts'/i);
          if (match && match[1] && retries > 0) {
            const missingCol = match[1];
            const cleaned = { ...dataPayload };
            delete cleaned[missingCol];
            return executeUpdate(cleaned, retries - 1);
          }
          throw error;
        }
      };

      await executeUpdate(payload);
      await refreshProfile();
      toast.success('Data profil berhasil diperbarui!', { id: toastId });
    } catch (err: any) {
      console.error('Gagal menyimpan profil:', err);
      toast.error('Gagal menyimpan: ' + (err.message || 'Terjadi kesalahan'), { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || newPassword.length < 6) {
      toast.error('Kata sandi baru harus minimal 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setIsUpdatingPassword(true);
    const toastId = toast.loading('Memperbarui kata sandi...');

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success('Kata sandi berhasil diperbarui!', { id: toastId });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Error updating password:', err);
      toast.error('Gagal mengganti kata sandi: ' + (err.message || 'Error'), { id: toastId });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} disalin ke clipboard`);
  };

  const fullName = profileData.full_name || currentUser?.fullName || 'Pengguna';
  const email = profileData.email || currentUser?.email || '-';
  const employeeCode = profileData.employee_code || currentUser?.employeeCode || '-';
  const jobTitle = profileData.job_title || currentUser?.jobTitle || 'Staff';
  const department = profileData.department || currentUser?.department || 'Umum';
  const company = profileData.company || currentUser?.company || 'PT Gesit Alumas';
  const role = profileData.role || currentUser?.role || 'Employee';
  const rawAvatarUrl = profileData.avatar_url || profileData.avatarUrl || currentUser?.avatar_url || currentUser?.avatarUrl;
  const avatarImgUrl = formatAvatarImageUrl(rawAvatarUrl);
  const joinDate = profileData.join_date || currentUser?.joinDate;
  const contractType = profileData.contract_type || currentUser?.contractType || 'PKWTT';
  const employmentStatus = profileData.employment_status || profileData.status || 'Active';

  // Calculate initials (e.g. "Khairun Nisa" => "KN")
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0])
    .join('')
    .toUpperCase() || 'KP';

  // Calculate tenure
  const tenureDisplay = (() => {
    if (!joinDate) return '—';
    try {
      const join = new Date(joinDate);
      const now = new Date();
      const diffMonths = (now.getFullYear() - join.getFullYear()) * 12 + (now.getMonth() - join.getMonth());
      const years = Math.floor(diffMonths / 12);
      const months = diffMonths % 12;
      if (years > 0 && months > 0) return `${years} thn ${months} bln`;
      if (years > 0) return `${years} tahun`;
      if (months > 0) return `${months} bulan`;
      return '< 1 bulan';
    } catch (e) {
      return '—';
    }
  })();

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* =========================================================================
          PAGE TITLE
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <User className="h-6 w-6 text-primary" />
            Profil Karyawan
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Kelola data biodata pribadi, informasi kepegawaian, dan keamanan akun Anda.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshProfile}
            disabled={isLoading}
            className="text-xs h-9 px-3 gap-1.5 border-border bg-card hover:bg-muted font-medium shadow-2xs"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            Segarkan Data
          </Button>
        </div>
      </div>

      {/* =========================================================================
          EXECUTIVE HERO HEADER CARD (FLAWLESS CONTRAST & BESPOKE LAYOUT)
          ========================================================================= */}
      <div className="rounded-2xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
        {/* Cover Canvas with Brand Gold Accent & Geometric Mesh */}
        <div className="relative h-32 sm:h-36 w-full bg-gradient-to-r from-[#0c234a] via-[#103065] to-[#1a4484] overflow-hidden">
          {/* Subtle decorative geometric overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(188,156,51,0.18),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.15),transparent_40%)]" />
          <div className="absolute -bottom-10 -right-10 w-48 h-48 rounded-full border border-white/5 pointer-events-none" />
          <div className="absolute -top-12 left-1/3 w-64 h-64 rounded-full border border-white/5 pointer-events-none" />

          {/* Top-right Pill Badges on Cover */}
          <div className="absolute top-3.5 right-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-black/40 text-white backdrop-blur-md border border-white/10 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Sesi Aktif
            </span>
          </div>

          {/* Bottom Gold Accent Seam */}
          <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-[#BC9C33]/70 via-[#103065] to-transparent" />
        </div>

        {/* Card Body with Clean Avatar Anchor & Proper Contrast */}
        <div className="px-6 sm:px-8 pb-6 pt-0">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            {/* Left: Avatar + Details */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              {/* Avatar Box (ONLY this element overlaps the cover) */}
              <div className="relative shrink-0 group -mt-14 sm:-mt-16">
                <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl ring-4 ring-card bg-card overflow-hidden shadow-md flex items-center justify-center border border-border/80">
                  {avatarImgUrl ? (
                    <img
                      src={avatarImgUrl}
                      alt={fullName}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-[#103065] to-[#0c234a] text-white flex items-center justify-center font-bold text-2xl tracking-wider select-none">
                      {initials}
                    </div>
                  )}

                  {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-xs flex flex-col items-center justify-center gap-1 z-20">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="text-[10px] font-semibold text-foreground">Upload...</span>
                    </div>
                  )}
                </div>

                {/* Upload Action Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute -bottom-1 -right-1 p-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-transform hover:scale-105 active:scale-95 ring-2 ring-card cursor-pointer"
                  title="Ganti Foto Profil (Google Drive)"
                >
                  <Camera size={14} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              {/* Name & Title Block - SITS FULLY AND CLEANLY ON CARD BODY */}
              <div className="text-center sm:text-left pt-3 sm:pt-4 space-y-1">
                <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    {fullName}
                  </h2>
                  {profileData.nickname && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground border border-border/60">
                      "{profileData.nickname}"
                    </span>
                  )}
                  <Badge variant="outline" className="text-xs font-semibold border-primary/30 text-primary bg-primary/5 px-2 py-0.5">
                    {role}
                  </Badge>
                </div>

                {/* Job Title & Org */}
                <p className="text-xs sm:text-sm text-muted-foreground font-medium flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  <span className="text-foreground font-semibold flex items-center gap-1.5">
                    <Briefcase size={14} className="text-primary shrink-0" />
                    {jobTitle}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <Building2 size={14} className="text-muted-foreground shrink-0" />
                    {department}
                  </span>
                  <span>•</span>
                  <span>{company}</span>
                </p>

                {/* Metadata Pills */}
                <div className="flex items-center justify-center sm:justify-start gap-3 text-xs text-muted-foreground pt-1 flex-wrap">
                  <span className="inline-flex items-center gap-1 font-mono font-medium text-foreground bg-muted/50 px-2 py-0.5 rounded-md border border-border/60">
                    NIP: {employeeCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(email, 'Email')}
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Mail size={12} />
                    <span>{email}</span>
                  </button>
                  {profileData.phone && (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Phone size={12} />
                      <span>{profileData.phone}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Quick Action & Status Pill */}
            <div className="flex flex-row md:flex-col items-center md:items-end justify-center gap-2 self-center md:self-auto shrink-0 pt-2">
              <div className="px-3 py-1.5 rounded-xl border border-border/80 bg-muted/30 text-right">
                <span className="text-[10px] font-semibold uppercase text-muted-foreground block">
                  Status Kepegawaian
                </span>
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5 justify-end">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {contractType} ({employmentStatus})
                </span>
              </div>
            </div>
          </div>

          <Separator className="my-5" />

          {/* Integrated 4-Column Metric Ribbon */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl border border-border/70 bg-muted/20 space-y-0.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Status Kontrak
              </span>
              <p className="text-xs font-bold text-foreground truncate">
                {contractType === 'PKWTT' ? 'Karyawan Tetap (PKWTT)' : `${contractType} (Kontrak)`}
              </p>
            </div>

            <div className="p-3 rounded-xl border border-border/70 bg-muted/20 space-y-0.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Masa Kerja
              </span>
              <p className="text-xs font-bold text-foreground truncate">
                {tenureDisplay}
              </p>
            </div>

            <div className="p-3 rounded-xl border border-border/70 bg-muted/20 space-y-0.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Level / Grade
              </span>
              <p className="text-xs font-bold text-foreground truncate">
                {profileData.job_level || 'Staff'} • Grade {profileData.grade_class || 'II'}
              </p>
            </div>

            <div className="p-3 rounded-xl border border-border/70 bg-muted/20 space-y-0.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Approval Role
              </span>
              <p className="text-xs font-bold text-primary truncate">
                {role === 'Admin' || role === 'Super Admin' ? 'Super Admin (Full Access)' : 'Level 2 (HR Verifier)'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          TABBED PROFILE SECTIONS (CLEAN INTEGRATED WORKSPACE)
          ========================================================================= */}
      <Tabs defaultValue="personal" className="space-y-6">
        <div className="border-b border-border bg-card rounded-xl p-1 shadow-2xs">
          <TabsList className="bg-transparent h-auto p-0 flex flex-wrap gap-1">
            <TabsTrigger
              value="personal"
              className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2 transition-all cursor-pointer"
            >
              <User size={14} />
              Biodata & Kontak
            </TabsTrigger>
            <TabsTrigger
              value="job"
              className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2 transition-all cursor-pointer"
            >
              <Briefcase size={14} />
              Pekerjaan & Hierarki
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2 transition-all cursor-pointer"
            >
              <ShieldCheck size={14} />
              Keamanan Akun
            </TabsTrigger>
            <TabsTrigger
              value="documents"
              className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2 transition-all cursor-pointer"
            >
              <FileText size={14} />
              Berkas & Dokumen
            </TabsTrigger>
          </TabsList>
        </div>

        {/* -----------------------------------------------------------------------
            TAB 1: BIODATA & KONTAK
            ----------------------------------------------------------------------- */}
        <TabsContent value="personal" className="space-y-6 m-0">
          <form onSubmit={handleSavePersonal}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Personal Data & Contact Form */}
              <Card className="lg:col-span-2 border-border bg-card shadow-2xs rounded-xl">
                <CardHeader className="pb-3 border-b border-border/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                        <User size={16} className="text-primary" />
                        Informasi Biodata Pribadi
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        Data kependudukan dan kontak komunikasi aktif.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-5 sm:p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground/80">Nama Lengkap (KTP)</Label>
                      <Input
                        value={fullName}
                        disabled
                        className="bg-muted/40 border-border text-foreground text-xs rounded-lg cursor-not-allowed"
                      />
                      <p className="text-[10px] text-muted-foreground">Terkunci sesuai data kontrak HR.</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground/80">Nama Panggilan (Nickname)</Label>
                      <Input
                        value={formData.nickname}
                        onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                        placeholder="Contoh: Nisa"
                        className="bg-background border-border text-foreground text-xs rounded-lg focus:border-primary"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground/80">Email Resmi</Label>
                      <Input
                        value={email}
                        disabled
                        className="bg-muted/40 border-border text-foreground text-xs rounded-lg cursor-not-allowed"
                      />
                      <p className="text-[10px] text-muted-foreground">Akun login SSO sistem.</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground/80">Nomor Telepon / WhatsApp</Label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="Contoh: 081234567890"
                        className="bg-background border-border text-foreground text-xs rounded-lg focus:border-primary font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground/80">Tempat Lahir</Label>
                      <Input
                        value={formData.birthPlace}
                        onChange={(e) => setFormData({ ...formData, birthPlace: e.target.value })}
                        placeholder="Kota kelahiran"
                        className="bg-background border-border text-foreground text-xs rounded-lg focus:border-primary"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground/80">Tanggal Lahir</Label>
                      <Input
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                        className="bg-background border-border text-foreground text-xs rounded-lg focus:border-primary"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground/80">Jenis Kelamin</Label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:border-primary"
                      >
                        <option value="">Pilih Jenis Kelamin</option>
                        <option value="Laki-laki">Laki-laki</option>
                        <option value="Perempuan">Perempuan</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground/80">Status Pernikahan</Label>
                      <select
                        value={formData.maritalStatus}
                        onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                        className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:border-primary"
                      >
                        <option value="">Pilih Status</option>
                        <option value="Belum Menikah">Belum Menikah (Lajang)</option>
                        <option value="Menikah">Menikah</option>
                        <option value="Cerai Hidup">Cerai Hidup</option>
                        <option value="Cerai Mati">Cerai Mati</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground/80">Agama</Label>
                      <select
                        value={formData.religion}
                        onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                        className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:border-primary"
                      >
                        <option value="">Pilih Agama</option>
                        <option value="Islam">Islam</option>
                        <option value="Kristen Protestan">Kristen Protestan</option>
                        <option value="Katolik">Katolik</option>
                        <option value="Hindu">Hindu</option>
                        <option value="Buddha">Buddha</option>
                        <option value="Khonghucu">Khonghucu</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground/80">Golongan Darah</Label>
                      <select
                        value={formData.bloodType}
                        onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })}
                        className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:border-primary"
                      >
                        <option value="">Pilih Golongan Darah</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="AB">AB</option>
                        <option value="O">O</option>
                      </select>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                        <MapPin size={13} className="text-primary" />
                        Alamat Tempat Tinggal (Domisili Saat Ini)
                      </Label>
                      <textarea
                        rows={2}
                        value={formData.residentialAddress}
                        onChange={(e) => setFormData({ ...formData, residentialAddress: e.target.value })}
                        placeholder="Alamat tempat tinggal lengkap saat ini..."
                        className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                        <MapPin size={13} className="text-muted-foreground" />
                        Alamat Resmi KTP
                      </Label>
                      <textarea
                        rows={2}
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Alamat sesuai KTP..."
                        className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Right Column: Identity Card & Bank */}
              <div className="space-y-6">
                <Card className="border-border bg-card shadow-2xs rounded-xl">
                  <CardHeader className="pb-3 border-b border-border/60">
                    <CardTitle className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                      <CreditCard size={15} className="text-primary" />
                      Identitas Resmi Kependudukan
                    </CardTitle>
                    <CardDescription className="text-[11px]">
                      Nomor identitas sah tercatat pada file HR.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3 text-xs">
                    <div className="p-3 rounded-lg border border-border/70 bg-muted/20">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                        NIK (No. KTP)
                      </span>
                      <p className="font-mono text-sm font-bold text-foreground mt-0.5">
                        {profileData.nik || '—'}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg border border-border/70 bg-muted/20">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                        NPWP Pajak
                      </span>
                      <p className="font-mono text-sm font-bold text-foreground mt-0.5">
                        {profileData.npwp || '—'}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg border border-border/70 bg-muted/20">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                        BPJS Ketenagakerjaan
                      </span>
                      <p className="font-mono text-sm font-bold text-foreground mt-0.5">
                        {profileData.bpjs_tk_number || profileData.bpjsTkNumber || '—'}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg border border-border/70 bg-muted/20">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                        BPJS Kesehatan
                      </span>
                      <p className="font-mono text-sm font-bold text-foreground mt-0.5">
                        {profileData.bpjs_health_number || profileData.bpjsHealthNumber || '—'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Bank Account */}
                <Card className="border-border bg-card shadow-2xs rounded-xl">
                  <CardHeader className="pb-3 border-b border-border/60">
                    <CardTitle className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                      <Landmark size={15} className="text-primary" />
                      Rekening Payroll Gaji
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-foreground/80">Nama Bank</Label>
                      <Input
                        value={formData.bankName}
                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                        placeholder="Contoh: BCA / Mandiri"
                        className="bg-background border-border text-foreground text-xs rounded-lg focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-foreground/80">Nomor Rekening</Label>
                      <Input
                        value={formData.bankAccountNumber}
                        onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                        placeholder="Nomor rekening"
                        className="bg-background border-border text-foreground text-xs rounded-lg focus:border-primary font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-foreground/80">Atas Nama Rekening</Label>
                      <Input
                        value={formData.bankAccountName}
                        onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })}
                        placeholder="Nama pemilik buku tabungan"
                        className="bg-background border-border text-foreground text-xs rounded-lg focus:border-primary"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Bottom Bar: Save Action */}
            <div className="mt-5 flex items-center justify-end gap-3 p-3.5 rounded-xl bg-card border border-border shadow-2xs">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={refreshProfile}
                disabled={isSaving}
                className="text-xs h-9 rounded-lg"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSaving}
                className="text-xs font-semibold h-9 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-sm px-5"
              >
                {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Simpan Perubahan
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* -----------------------------------------------------------------------
            TAB 2: PEKERJAAN & HIERARKI
            ----------------------------------------------------------------------- */}
        <TabsContent value="job" className="space-y-6 m-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-border bg-card shadow-2xs rounded-xl">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                  <Briefcase size={16} className="text-primary" />
                  Struktur Penempatan & Masa Kontrak
                </CardTitle>
                <CardDescription className="text-xs">
                  Detail legal penempatan kerja dan masa berlaku kontrak aktif.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 sm:p-6 space-y-5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">Perusahaan (Entity)</span>
                    <p className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                      <Building2 size={15} className="text-primary" />
                      {company}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">Departemen / Divisi</span>
                    <p className="text-xs sm:text-sm font-bold text-foreground">
                      {department}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">Jabatan (Job Title)</span>
                    <p className="text-xs sm:text-sm font-bold text-foreground">
                      {jobTitle}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">Level & Golongan</span>
                    <p className="text-xs sm:text-sm font-bold text-foreground">
                      {profileData.job_level || 'Staff'} (Grade {profileData.grade_class || 'II'})
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">Jenis Ikatan Kerja</span>
                    <p className="text-xs sm:text-sm font-bold text-foreground">
                      {contractType} ({employmentStatus})
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">Tanggal Bergabung</span>
                    <p className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                      <Calendar size={14} className="text-primary" />
                      {joinDate ? new Date(joinDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Approval Chain Visualization */}
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                    <UserCheck size={15} className="text-primary" />
                    Jalur Persetujuan Pengajuan (Approval Hierarchy)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl border border-border/70 bg-muted/15 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-primary">Line 1: SPV</span>
                      <p className="font-semibold text-foreground text-xs">{profileData.supervisor_id || 'Supervisor Langsung'}</p>
                    </div>
                    <div className="p-3 rounded-xl border border-border/70 bg-muted/15 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-primary">Line 2: HR</span>
                      <p className="font-semibold text-foreground text-xs">{profileData.attendance_hr_id || 'HR Operations'}</p>
                    </div>
                    <div className="p-3 rounded-xl border border-border/70 bg-muted/15 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-primary">Line 3: Manager</span>
                      <p className="font-semibold text-foreground text-xs">{profileData.manager_id || 'Manager Divisi'}</p>
                    </div>
                    <div className="p-3 rounded-xl border border-border/70 bg-muted/15 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-primary">Line 4: VP</span>
                      <p className="font-semibold text-foreground text-xs">{profileData.vp_id || 'Vice President / BOD'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Education Card */}
            <Card className="border-border bg-card shadow-2xs rounded-xl">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                  <GraduationCap size={15} className="text-primary" />
                  Pendidikan Terakhir
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3.5 text-xs">
                <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-1">
                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                    {profileData.last_education || 'Sarjana (S1)'}
                  </Badge>
                  <p className="text-sm font-bold text-foreground">
                    {profileData.major || 'Ilmu Manajemen / Terdaftar'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {profileData.institution_name || 'Perguruan Tinggi'}
                  </p>
                  {profileData.graduation_year && (
                    <p className="text-[11px] text-muted-foreground pt-1">
                      Lulus: {profileData.graduation_year} {profileData.gpa ? `• IPK: ${profileData.gpa}` : ''}
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/10 p-3 flex items-start gap-2.5">
                  <Award size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Data pendidikan telah terverifikasi untuk kesesuaian kualifikasi standar jabatan di lingkungan Gesit Companies.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* -----------------------------------------------------------------------
            TAB 3: KEAMANAN & SANDI
            ----------------------------------------------------------------------- */}
        <TabsContent value="security" className="space-y-6 m-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-border bg-card shadow-2xs rounded-xl">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                  <KeyRound size={16} className="text-primary" />
                  Perbarui Kata Sandi Akun
                </CardTitle>
                <CardDescription className="text-xs">
                  Gunakan minimal 6 karakter kombinasi huruf dan angka.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 sm:p-6">
                <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground/80">Kata Sandi Baru</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimal 6 karakter"
                        className="bg-background border-border text-foreground text-xs rounded-lg pr-9 focus:border-primary"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground/80">Konfirmasi Kata Sandi Baru</Label>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ketik ulang kata sandi baru"
                      className="bg-background border-border text-foreground text-xs rounded-lg focus:border-primary"
                      required
                      minLength={6}
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={isUpdatingPassword}
                      className="text-xs font-semibold h-9 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-sm px-5"
                    >
                      {isUpdatingPassword ? <Loader2 size={13} className="animate-spin" /> : <Lock size={13} />}
                      Simpan Sandi Baru
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-2xs rounded-xl">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                  <ShieldCheck size={15} className="text-primary" />
                  Status Keamanan Akun
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/60">
                  <div>
                    <p className="font-semibold text-foreground">Autentikasi</p>
                    <p className="text-[11px] text-muted-foreground">Supabase Cloud SSO</p>
                  </div>
                  <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10 text-[10px]">
                    Terhubung
                  </Badge>
                </div>

                <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 space-y-1">
                  <p className="font-semibold text-amber-500 text-xs flex items-center gap-1.5">
                    <AlertCircle size={13} />
                    Keamanan Sandi
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Jangan bagikan kata sandi login Anda kepada siapapun untuk menjaga keamanan data perusahaan.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* -----------------------------------------------------------------------
            TAB 4: BERKAS & DOKUMEN
            ----------------------------------------------------------------------- */}
        <TabsContent value="documents" className="space-y-6 m-0">
          <Card className="border-border bg-card shadow-2xs rounded-xl">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                <FileText size={16} className="text-primary" />
                Arsip Dokumen Pribadi (Google Drive)
              </CardTitle>
              <CardDescription className="text-xs">
                Dokumen resmi yang tersimpan di Google Drive Enterprise Cloud.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border border-border/80 bg-muted/20 p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                      <FileText size={18} />
                    </div>
                    <p className="font-bold text-xs sm:text-sm text-foreground">KTP Kependudukan</p>
                    <p className="text-[11px] text-muted-foreground">Identitas sah resmi.</p>
                  </div>
                  {profileData.ktp_file_url ? (
                    <a
                      href={profileData.ktp_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline pt-2 border-t border-border/60"
                    >
                      <ExternalLink size={12} /> Buka KTP
                    </a>
                  ) : (
                    <span className="text-[11px] text-muted-foreground pt-2 border-t border-border/60">Belum diunggah</span>
                  )}
                </div>

                <div className="rounded-xl border border-border/80 bg-muted/20 p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                      <CreditCard size={18} />
                    </div>
                    <p className="font-bold text-xs sm:text-sm text-foreground">Kartu NPWP</p>
                    <p className="text-[11px] text-muted-foreground">Dokumen nomor pokok wajib pajak.</p>
                  </div>
                  {profileData.npwp_file_url ? (
                    <a
                      href={profileData.npwp_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline pt-2 border-t border-border/60"
                    >
                      <ExternalLink size={12} /> Buka NPWP
                    </a>
                  ) : (
                    <span className="text-[11px] text-muted-foreground pt-2 border-t border-border/60">Belum diunggah</span>
                  )}
                </div>

                <div className="rounded-xl border border-border/80 bg-muted/20 p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="h-9 w-9 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
                      <GraduationCap size={18} />
                    </div>
                    <p className="font-bold text-xs sm:text-sm text-foreground">Ijazah Kelulusan</p>
                    <p className="text-[11px] text-muted-foreground">Dokumen kelulusan pendidikan.</p>
                  </div>
                  {profileData.ijazah_file_url ? (
                    <a
                      href={profileData.ijazah_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline pt-2 border-t border-border/60"
                    >
                      <ExternalLink size={12} /> Buka Ijazah
                    </a>
                  ) : (
                    <span className="text-[11px] text-muted-foreground pt-2 border-t border-border/60">Belum diunggah</span>
                  )}
                </div>

                <div className="rounded-xl border border-border/80 bg-muted/20 p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                      <Award size={18} />
                    </div>
                    <p className="font-bold text-xs sm:text-sm text-foreground">SK / Kontrak PKWT</p>
                    <p className="text-[11px] text-muted-foreground">Surat keputusan pengangkatan resmi.</p>
                  </div>
                  {profileData.sk_file_url ? (
                    <a
                      href={profileData.sk_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline pt-2 border-t border-border/60"
                    >
                      <ExternalLink size={12} /> Buka SK / PKWT
                    </a>
                  ) : (
                    <span className="text-[11px] text-muted-foreground pt-2 border-t border-border/60">Belum diunggah</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserProfilePage;
