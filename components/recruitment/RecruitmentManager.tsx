import React, { useState, useMemo } from 'react';
import {
  Briefcase,
  Users,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  UserCheck,
  Building2,
  FileText,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  ChevronRight,
  UserPlus,
  Trash2,
  X,
  ExternalLink,
  Award,
  Check,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserAvatar } from '../UserAvatar';

export type CandidateStage = 'Melamar' | 'Skrining CV' | 'Interview HR' | 'Interview User' | 'Offering' | 'Diterima' | 'Ditolak';

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  appliedPosition: string;
  department: string;
  company: string;
  stage: CandidateStage;
  experienceYears: number;
  expectedSalary: number;
  lastEducation: string;
  appliedDate: string;
  ratingScore: number; // 1 - 5
  source: string;
  notes?: string;
}

export interface JobOpening {
  id: string;
  title: string;
  department: string;
  company: string;
  employmentType: 'Full-Time' | 'PKWT' | 'Magang';
  experienceLevel: string;
  salaryRange: string;
  location: string;
  status: 'Open' | 'Closed';
  applicantsCount: number;
  postedDate: string;
  description: string;
  requirements: string[];
}

const STAGES: CandidateStage[] = [
  'Melamar',
  'Skrining CV',
  'Interview HR',
  'Interview User',
  'Offering',
  'Diterima',
  'Ditolak'
];

export const RecruitmentManager: React.FC = () => {
  // Sample Initial Job Openings
  const [jobs, setJobs] = useState<JobOpening[]>([
    {
      id: 'JOB-001',
      title: 'Talent Acquisition & HR Officer',
      department: 'HR & Logistics',
      company: 'PT Gesit Alumas',
      employmentType: 'Full-Time',
      experienceLevel: '2 - 4 Tahun',
      salaryRange: 'Rp 7.000.000 - Rp 9.000.000',
      location: 'Jakarta Selatan',
      status: 'Open',
      applicantsCount: 14,
      postedDate: '2026-10-01',
      description: 'Bertanggung jawab atas proses rekrutmen end-to-end, onboarding karyawan, dan administrasi database talenta.',
      requirements: ['S1 Psikologi/Manajemen SDM', 'Pengalaman ATS minimal 2 tahun', 'Memahami UU Ketenagakerjaan']
    },
    {
      id: 'JOB-002',
      title: 'Senior Accounting & Tax Specialist',
      department: 'Finance & Accounting',
      company: 'PT Gesit Alumas',
      employmentType: 'Full-Time',
      experienceLevel: '3 - 5 Tahun',
      salaryRange: 'Rp 9.500.000 - Rp 12.000.000',
      location: 'Jakarta Selatan',
      status: 'Open',
      applicantsCount: 8,
      postedDate: '2026-10-05',
      description: 'Mengelola pelaporan keuangan bulanan, audit tahunan, serta kepatuhan perpajakan korporasi (PPh, PPN).',
      requirements: ['S1 Akuntansi', 'Memiliki Brevet A/B', 'Terbiasa menyusun laporan keuangan multi-entity']
    },
    {
      id: 'JOB-003',
      title: 'Plant Operations Supervisor',
      department: 'Operasional',
      company: 'PT Gesit Alumas',
      employmentType: 'PKWT',
      experienceLevel: '3 - 5 Tahun',
      salaryRange: 'Rp 8.000.000 - Rp 10.500.000',
      location: 'Pabrik Cikarang',
      status: 'Open',
      applicantsCount: 6,
      postedDate: '2026-09-28',
      description: 'Mengawasi jadwal shift operasional produksi harian dan keselamatan kerja k3 di area pabrik.',
      requirements: ['D3/S1 Teknik Mesin/Industri', 'Sertifikat K3 Umum', 'Pengalaman supervisi tim lapangan']
    }
  ]);

  // Sample Initial Candidates
  const [candidates, setCandidates] = useState<Candidate[]>([
    {
      id: 'CND-101',
      name: 'Rian Pratama',
      email: 'rian.pratama@gmail.com',
      phone: '081289123412',
      appliedPosition: 'Talent Acquisition & HR Officer',
      department: 'HR & Logistics',
      company: 'PT Gesit Alumas',
      stage: 'Interview User',
      experienceYears: 3,
      expectedSalary: 8000000,
      lastEducation: 'S1 Psikologi (UI)',
      appliedDate: '2026-10-03',
      ratingScore: 4,
      source: 'LinkedIn',
      notes: 'Komunikasi baik, memahami sourcing tech & operasional pabrik. Siap join 1 bulan notice.'
    },
    {
      id: 'CND-102',
      name: 'Dewi Lestari',
      email: 'dewi.lestari@yahoo.com',
      phone: '085718293012',
      appliedPosition: 'Senior Accounting & Tax Specialist',
      department: 'Finance & Accounting',
      company: 'PT Gesit Alumas',
      stage: 'Offering',
      experienceYears: 4,
      expectedSalary: 11000000,
      lastEducation: 'S1 Akuntansi (Unpad)',
      appliedDate: '2026-10-06',
      ratingScore: 5,
      source: 'JobStreet',
      notes: 'Lulus tes teknis perpajakan score 92. Menunggu approval offering letter dari BOD.'
    },
    {
      id: 'CND-103',
      name: 'Bagus Wicaksono',
      email: 'bagus.wicak@gmail.com',
      phone: '081399812731',
      appliedPosition: 'Plant Operations Supervisor',
      department: 'Operasional',
      company: 'PT Gesit Alumas',
      stage: 'Skrining CV',
      experienceYears: 3,
      expectedSalary: 8500000,
      lastEducation: 'S1 Teknik Industri',
      appliedDate: '2026-10-10',
      ratingScore: 3,
      source: 'Referral',
      notes: 'CV relevan, verifikasi sertifikat K3 sedang dilakukan.'
    },
    {
      id: 'CND-104',
      name: 'Anisa Fitriani',
      email: 'anisa.fitri@gmail.com',
      phone: '081298412019',
      appliedPosition: 'Talent Acquisition & HR Officer',
      department: 'HR & Logistics',
      company: 'PT Gesit Alumas',
      stage: 'Melamar',
      experienceYears: 2,
      expectedSalary: 7500000,
      lastEducation: 'S1 Manajemen',
      appliedDate: '2026-10-12',
      ratingScore: 3,
      source: 'Website Karir',
      notes: 'Lamaran baru masuk via portal karir.'
    }
  ]);

  const [activeTab, setActiveTab] = useState<'candidates' | 'jobs'>('candidates');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJobFilter, setSelectedJobFilter] = useState('All');
  const [selectedStageFilter, setSelectedStageFilter] = useState('All');

  // Modals
  const [viewCandidate, setViewCandidate] = useState<Candidate | null>(null);
  const [isAddCandidateOpen, setIsAddCandidateOpen] = useState(false);
  const [isAddJobOpen, setIsAddJobOpen] = useState(false);

  // New Candidate Form State
  const [newCandidateData, setNewCandidateData] = useState({
    name: '',
    email: '',
    phone: '',
    appliedPosition: jobs[0]?.title || '',
    expectedSalary: 7000000,
    experienceYears: 2,
    lastEducation: 'S1 Sarjana',
    source: 'LinkedIn',
    notes: ''
  });

  // New Job Form State
  const [newJobData, setNewJobData] = useState({
    title: '',
    department: 'HR & Logistics',
    company: 'PT Gesit Alumas',
    employmentType: 'Full-Time' as const,
    experienceLevel: '2 - 4 Tahun',
    salaryRange: 'Rp 6.000.000 - Rp 8.500.000',
    location: 'Jakarta',
    description: '',
    requirements: ''
  });

  // Filtered Candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.appliedPosition.toLowerCase().includes(searchQuery.toLowerCase());
      const matchJob = selectedJobFilter === 'All' || c.appliedPosition === selectedJobFilter;
      const matchStage = selectedStageFilter === 'All' || c.stage === selectedStageFilter;
      return matchSearch && matchJob && matchStage;
    });
  }, [candidates, searchQuery, selectedJobFilter, selectedStageFilter]);

  // KPI Calculations
  const totalOpenJobs = jobs.filter(j => j.status === 'Open').length;
  const totalApplicants = candidates.length;
  const inInterview = candidates.filter(c => c.stage === 'Interview HR' || c.stage === 'Interview User').length;
  const hiredCount = candidates.filter(c => c.stage === 'Diterima').length;

  // Handle Update Candidate Stage
  const handleUpdateStage = (candidateId: string, newStage: CandidateStage) => {
    setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, stage: newStage } : c));
    if (viewCandidate && viewCandidate.id === candidateId) {
      setViewCandidate(prev => prev ? { ...prev, stage: newStage } : null);
    }
    toast.success(`Status kandidat berhasil diubah ke: ${newStage}`);
  };

  // Convert Hired Candidate to Employee in user_accounts
  const handleConvertToEmployee = async (cand: Candidate) => {
    const toastId = toast.loading(`Mendaftarkan ${cand.name} sebagai karyawan baru...`);
    try {
      const targetJob = jobs.find(j => j.title === cand.appliedPosition);
      const payload = {
        full_name: cand.name,
        email: cand.email,
        phone: cand.phone,
        job_title: cand.appliedPosition,
        department: cand.department || targetJob?.department || 'Operasional',
        company: cand.company || targetJob?.company || 'PT Gesit Alumas',
        role: 'Employee',
        status: 'Active',
        employment_status: 'Active',
        contract_type: targetJob?.employmentType === 'Full-Time' ? 'PKWTT' : 'PKWT',
        join_date: new Date().toISOString().split('T')[0],
        last_education: cand.lastEducation,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('user_accounts').insert([payload]);
      if (error) throw error;

      // Update candidate stage to Diterima
      handleUpdateStage(cand.id, 'Diterima');
      toast.success(`${cand.name} berhasil didaftarkan ke Data Karyawan!`, { id: toastId });
    } catch (err: any) {
      console.error('Error convert candidate:', err);
      toast.error('Gagal mendaftarkan karyawan: ' + (err.message || 'Error'), { id: toastId });
    }
  };

  // Create Candidate
  const handleCreateCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    const newCand: Candidate = {
      id: `CND-${Date.now().toString().slice(-4)}`,
      name: newCandidateData.name,
      email: newCandidateData.email,
      phone: newCandidateData.phone,
      appliedPosition: newCandidateData.appliedPosition,
      department: jobs.find(j => j.title === newCandidateData.appliedPosition)?.department || 'Umum',
      company: 'PT Gesit Alumas',
      stage: 'Melamar',
      experienceYears: Number(newCandidateData.experienceYears),
      expectedSalary: Number(newCandidateData.expectedSalary),
      lastEducation: newCandidateData.lastEducation,
      appliedDate: new Date().toISOString().split('T')[0],
      ratingScore: 3,
      source: newCandidateData.source,
      notes: newCandidateData.notes
    };

    setCandidates(prev => [newCand, ...prev]);
    setIsAddCandidateOpen(false);
    toast.success(`Kandidat ${newCand.name} berhasil ditambahkan ke pipeline!`);
  };

  // Create Job Opening
  const handleCreateJob = (e: React.FormEvent) => {
    e.preventDefault();
    const newJob: JobOpening = {
      id: `JOB-${Date.now().toString().slice(-3)}`,
      title: newJobData.title,
      department: newJobData.department,
      company: newJobData.company,
      employmentType: newJobData.employmentType,
      experienceLevel: newJobData.experienceLevel,
      salaryRange: newJobData.salaryRange,
      location: newJobData.location,
      status: 'Open',
      applicantsCount: 0,
      postedDate: new Date().toISOString().split('T')[0],
      description: newJobData.description,
      requirements: newJobData.requirements.split(',').map(r => r.trim()).filter(Boolean)
    };

    setJobs(prev => [newJob, ...prev]);
    setIsAddJobOpen(false);
    toast.success(`Lowongan ${newJob.title} berhasil dipublikasikan!`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* =========================================================================
          PAGE HEADER & ACTIONS
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Briefcase className="h-6 w-6 text-primary" />
            Rekrutmen & Talent Pipeline
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Kelola lowongan pekerjaan, alur seleksi pelamar, dan konversi ke data karyawan.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddJobOpen(true)}
            className="text-xs h-9 px-3 gap-1.5 border-border bg-card hover:bg-muted font-medium shadow-2xs"
          >
            <Plus size={14} />
            Buka Lowongan Baru
          </Button>
          <Button
            size="sm"
            onClick={() => setIsAddCandidateOpen(true)}
            className="text-xs h-9 px-3.5 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
          >
            <UserPlus size={14} />
            Tambah Pelamar
          </Button>
        </div>
      </div>

      {/* =========================================================================
          KPI CARDS
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border bg-card shadow-2xs rounded-xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Lowongan Aktif</span>
              <Briefcase size={16} className="text-primary" />
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
              {totalOpenJobs} Posisi
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-[11px] text-muted-foreground">Posisi terbuka di GESIT Companies</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-2xs rounded-xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Total Pelamar</span>
              <Users size={16} className="text-blue-500" />
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
              {totalApplicants} Kandidat
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-[11px] text-muted-foreground">Terekam dalam sistem ATS</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-2xs rounded-xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Tahap Wawancara</span>
              <Clock size={16} className="text-amber-500" />
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
              {inInterview} Kandidat
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-[11px] text-muted-foreground">Interview HR & Technical User</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-2xs rounded-xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Siap Bergabung</span>
              <UserCheck size={16} className="text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
              {hiredCount} Karyawan
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-[11px] text-muted-foreground">Offering disetujui / onboarding</p>
          </CardContent>
        </Card>
      </div>

      {/* =========================================================================
          MAIN TABS: KANDIDAT & LOWONGAN
          ========================================================================= */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="space-y-4">
        <div className="border-b border-border bg-card rounded-xl p-1 shadow-2xs">
          <TabsList className="bg-transparent h-auto p-0 flex gap-1">
            <TabsTrigger
              value="candidates"
              className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2 transition-all cursor-pointer"
            >
              <Users size={14} />
              Pipeline Pelamar & Kandidat ({candidates.length})
            </TabsTrigger>
            <TabsTrigger
              value="jobs"
              className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2 transition-all cursor-pointer"
            >
              <Briefcase size={14} />
              Daftar Lowongan Pekerjaan ({jobs.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* -----------------------------------------------------------------------
            TAB 1: KANDIDAT & PELAMAR
            ----------------------------------------------------------------------- */}
        <TabsContent value="candidates" className="space-y-4 m-0">
          <Card className="border-border bg-card shadow-2xs rounded-xl overflow-hidden">
            {/* Filter Toolbar */}
            <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari kandidat, email, posisi..."
                  className="h-9 pl-9 text-xs bg-background border-border rounded-lg"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={selectedJobFilter}
                  onChange={(e) => setSelectedJobFilter(e.target.value)}
                  className="h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none"
                >
                  <option value="All">Semua Posisi Lowongan</option>
                  {jobs.map(j => (
                    <option key={j.id} value={j.title}>{j.title}</option>
                  ))}
                </select>

                <select
                  value={selectedStageFilter}
                  onChange={(e) => setSelectedStageFilter(e.target.value)}
                  className="h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none"
                >
                  <option value="All">Semua Tahapan Seleksi</option>
                  {STAGES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Candidates Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="px-4 py-3.5">Nama Kandidat</th>
                    <th className="px-4 py-3.5">Posisi Dilamar</th>
                    <th className="px-4 py-3.5">Kontak</th>
                    <th className="px-4 py-3.5">Pengalaman & Studi</th>
                    <th className="px-4 py-3.5 text-right">Ekspektasi Gaji</th>
                    <th className="px-4 py-3.5 text-center">Tahapan ATS</th>
                    <th className="px-4 py-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        Belum ada pelamar yang sesuai kriteria pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredCandidates.map((cand) => (
                      <tr key={cand.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <UserAvatar name={cand.name} size="sm" />
                            <div>
                              <p className="font-bold text-foreground text-xs">{cand.name}</p>
                              <p className="text-[11px] text-muted-foreground">Sumber: {cand.source}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-foreground">{cand.appliedPosition}</p>
                          <p className="text-[10px] text-muted-foreground">{cand.department}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{cand.email}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">{cand.phone}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{cand.experienceYears} Tahun Pengalaman</p>
                          <p className="text-[11px] text-muted-foreground">{cand.lastEducation}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-foreground">
                          Rp {cand.expectedSalary.toLocaleString('id-ID')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge
                            variant="outline"
                            className={
                              cand.stage === 'Diterima' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' :
                              cand.stage === 'Offering' ? 'bg-blue-500/10 text-blue-600 border-blue-500/30' :
                              cand.stage === 'Ditolak' ? 'bg-rose-500/10 text-rose-600 border-rose-500/30' :
                              'bg-amber-500/10 text-amber-600 border-amber-500/30'
                            }
                          >
                            {cand.stage}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewCandidate(cand)}
                              className="h-8 px-2 text-xs font-semibold text-primary hover:bg-primary/10"
                            >
                              Review
                            </Button>
                            {cand.stage === 'Offering' && (
                              <Button
                                size="sm"
                                onClick={() => handleConvertToEmployee(cand)}
                                className="h-8 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                title="Terima & Jadikan Karyawan"
                              >
                                Rekrut
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* -----------------------------------------------------------------------
            TAB 2: DAFTAR LOWONGAN PEKERJAAN
            ----------------------------------------------------------------------- */}
        <TabsContent value="jobs" className="space-y-4 m-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job) => (
              <Card key={job.id} className="border-border bg-card shadow-2xs rounded-xl flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Badge variant="outline" className="text-[10px] border-primary/30 text-primary mb-1.5">
                        {job.employmentType} • {job.department}
                      </Badge>
                      <CardTitle className="text-base font-bold text-foreground">
                        {job.title}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{job.company} • {job.location}</p>
                    </div>
                    <Badge className={job.status === 'Open' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]' : 'bg-muted text-muted-foreground text-[10px]'}>
                      {job.status === 'Open' ? 'Aktif' : 'Tutup'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-xs pt-0">
                  <p className="text-muted-foreground line-clamp-2 leading-relaxed">
                    {job.description}
                  </p>

                  <div className="rounded-lg bg-muted/20 p-2.5 border border-border/60 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Kisaran Gaji:</span>
                      <span className="font-semibold text-foreground">{job.salaryRange}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pengalaman:</span>
                      <span className="font-medium text-foreground">{job.experienceLevel}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/80 flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Users size={13} /> {job.applicantsCount} Pelamar
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedJobFilter(job.title);
                        setActiveTab('candidates');
                      }}
                      className="text-xs text-primary font-semibold h-7 px-2 hover:bg-primary/10"
                    >
                      Lihat Pelamar <ChevronRight size={13} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* =========================================================================
          MODAL DETAIL KANDIDAT & REVIEW
          ========================================================================= */}
      {viewCandidate && (
        <Dialog open={!!viewCandidate} onOpenChange={() => setViewCandidate(null)}>
          <DialogContent className="max-w-xl bg-card border-border p-6 rounded-2xl shadow-2xl">
            <div className="space-y-4 text-xs">
              <div className="flex items-start justify-between border-b border-border pb-3">
                <div className="flex items-center gap-3">
                  <UserAvatar name={viewCandidate.name} size="md" />
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{viewCandidate.name}</h2>
                    <p className="text-xs text-muted-foreground font-medium">{viewCandidate.appliedPosition}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs font-semibold">
                  Tahap: {viewCandidate.stage}
                </Badge>
              </div>

              {/* Detail Info Grid */}
              <div className="grid grid-cols-2 gap-3 bg-muted/20 p-3.5 rounded-xl border border-border/60">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Email</span>
                  <p className="font-medium text-foreground">{viewCandidate.email}</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Nomor Telepon</span>
                  <p className="font-medium text-foreground font-mono">{viewCandidate.phone}</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Pengalaman</span>
                  <p className="font-medium text-foreground">{viewCandidate.experienceYears} Tahun</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Ekspektasi Gaji</span>
                  <p className="font-bold text-foreground">Rp {viewCandidate.expectedSalary.toLocaleString('id-ID')}</p>
                </div>
              </div>

              {/* Notes */}
              {viewCandidate.notes && (
                <div className="p-3 rounded-xl bg-muted/30 border border-border/80 space-y-1">
                  <span className="text-[11px] font-bold text-foreground">Catatan Interviewer:</span>
                  <p className="text-muted-foreground leading-relaxed">{viewCandidate.notes}</p>
                </div>
              )}

              {/* Progress Stage Action */}
              <div className="space-y-2 pt-2 border-t border-border">
                <span className="font-bold text-foreground">Pindahkan Tahap Seleksi:</span>
                <div className="flex flex-wrap gap-1.5">
                  {STAGES.map((stg) => (
                    <Button
                      key={stg}
                      variant={viewCandidate.stage === stg ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleUpdateStage(viewCandidate.id, stg)}
                      className="text-[11px] h-7 px-2.5 rounded-lg"
                    >
                      {stg}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Conversion Action */}
              {viewCandidate.stage === 'Offering' && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-emerald-600 text-xs">Kandidat Telah Menerima Offering?</p>
                    <p className="text-[11px] text-muted-foreground">Daftarkan langsung menjadi karyawan aktif GESIT.</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      handleConvertToEmployee(viewCandidate);
                      setViewCandidate(null);
                    }}
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
                  >
                    <UserPlus size={13} />
                    Terima & Buat Akun
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* =========================================================================
          MODAL TAMBAH PELAMAR BARU
          ========================================================================= */}
      {isAddCandidateOpen && (
        <Dialog open={isAddCandidateOpen} onOpenChange={() => setIsAddCandidateOpen(false)}>
          <DialogContent className="max-w-md bg-card border-border p-6 rounded-2xl shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground">Registrasi Pelamar Baru</DialogTitle>
              <DialogDescription className="text-xs">Masukkan informasi profil kandidat yang melamar.</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateCandidate} className="space-y-3.5 text-xs pt-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Nama Lengkap</Label>
                <Input
                  value={newCandidateData.name}
                  onChange={(e) => setNewCandidateData({ ...newCandidateData, name: e.target.value })}
                  placeholder="Nama pelamar"
                  required
                  className="bg-background border-border text-xs rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Email</Label>
                  <Input
                    type="email"
                    value={newCandidateData.email}
                    onChange={(e) => setNewCandidateData({ ...newCandidateData, email: e.target.value })}
                    placeholder="email@kandidat.com"
                    required
                    className="bg-background border-border text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Nomor Telepon</Label>
                  <Input
                    value={newCandidateData.phone}
                    onChange={(e) => setNewCandidateData({ ...newCandidateData, phone: e.target.value })}
                    placeholder="0812..."
                    required
                    className="bg-background border-border text-xs rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Posisi Lowongan yang Dilamar</Label>
                <select
                  value={newCandidateData.appliedPosition}
                  onChange={(e) => setNewCandidateData({ ...newCandidateData, appliedPosition: e.target.value })}
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none"
                >
                  {jobs.map(j => (
                    <option key={j.id} value={j.title}>{j.title}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Pengalaman (Tahun)</Label>
                  <Input
                    type="number"
                    value={newCandidateData.experienceYears}
                    onChange={(e) => setNewCandidateData({ ...newCandidateData, experienceYears: Number(e.target.value) })}
                    className="bg-background border-border text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Ekspektasi Gaji (IDR)</Label>
                  <Input
                    type="number"
                    value={newCandidateData.expectedSalary}
                    onChange={(e) => setNewCandidateData({ ...newCandidateData, expectedSalary: Number(e.target.value) })}
                    className="bg-background border-border text-xs rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Catatan / Keterangan Profil</Label>
                <textarea
                  rows={2}
                  value={newCandidateData.notes}
                  onChange={(e) => setNewCandidateData({ ...newCandidateData, notes: e.target.value })}
                  placeholder="Kesan pertama, keahlian khusus..."
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-foreground focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddCandidateOpen(false)} className="text-xs">
                  Batal
                </Button>
                <Button type="submit" size="sm" className="text-xs bg-primary text-primary-foreground font-semibold">
                  Simpan Pelamar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* =========================================================================
          MODAL BUAT LOWONGAN BARU
          ========================================================================= */}
      {isAddJobOpen && (
        <Dialog open={isAddJobOpen} onOpenChange={() => setIsAddJobOpen(false)}>
          <DialogContent className="max-w-lg bg-card border-border p-6 rounded-2xl shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground">Publikasikan Lowongan Kerja Baru</DialogTitle>
              <DialogDescription className="text-xs">Buka posisi pekerjaan baru untuk divisi perusahaan.</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateJob} className="space-y-3.5 text-xs pt-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Judul Posisi Lowongan</Label>
                <Input
                  value={newJobData.title}
                  onChange={(e) => setNewJobData({ ...newJobData, title: e.target.value })}
                  placeholder="Contoh: Senior Backend Engineer"
                  required
                  className="bg-background border-border text-xs rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Departemen</Label>
                  <Input
                    value={newJobData.department}
                    onChange={(e) => setNewJobData({ ...newJobData, department: e.target.value })}
                    required
                    className="bg-background border-border text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Tipe Ikatan Kerja</Label>
                  <select
                    value={newJobData.employmentType}
                    onChange={(e) => setNewJobData({ ...newJobData, employmentType: e.target.value as any })}
                    className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none"
                  >
                    <option value="Full-Time">Full-Time (Tetap)</option>
                    <option value="PKWT">PKWT (Kontrak)</option>
                    <option value="Magang">Magang / Internship</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Kisaran Gaji</Label>
                  <Input
                    value={newJobData.salaryRange}
                    onChange={(e) => setNewJobData({ ...newJobData, salaryRange: e.target.value })}
                    placeholder="Rp 7.000.000 - Rp 10.000.000"
                    className="bg-background border-border text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Lokasi Penempatan</Label>
                  <Input
                    value={newJobData.location}
                    onChange={(e) => setNewJobData({ ...newJobData, location: e.target.value })}
                    placeholder="Jakarta / Cikarang"
                    className="bg-background border-border text-xs rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Deskripsi Tugas</Label>
                <textarea
                  rows={2}
                  value={newJobData.description}
                  onChange={(e) => setNewJobData({ ...newJobData, description: e.target.value })}
                  placeholder="Ringkasan tanggung jawab posisi ini..."
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-foreground focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Persyaratan Kualifikasi (pisahkan dengan koma)</Label>
                <Input
                  value={newJobData.requirements}
                  onChange={(e) => setNewJobData({ ...newJobData, requirements: e.target.value })}
                  placeholder="S1 Komputer, Pengalaman 2 tahun, Menguasai SQL"
                  className="bg-background border-border text-xs rounded-lg"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddJobOpen(false)} className="text-xs">
                  Batal
                </Button>
                <Button type="submit" size="sm" className="text-xs bg-primary text-primary-foreground font-semibold">
                  Terbitkan Lowongan
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default RecruitmentManager;
