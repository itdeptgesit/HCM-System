import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Clock,
  Calendar,
  FileText,
  Award,
  DollarSign,
  Building2,
  Menu,
  X,
  LogOut,
  Sun,
  Moon,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Toaster, toast } from 'sonner';

// HR Components
import HRDashboard from './components/hr/HRDashboard';
import { EmployeeDataManager } from './components/EmployeeDataManager';
import { AttendanceManager } from './components/AttendanceManager';
import { supabase } from './lib/supabaseClient';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>({
    id: 1,
    fullName: 'HR Administrator',
    email: 'admin.hr@gesit.co.id',
    role: 'Super Admin',
    groups: ['admin', 'hr', 'hrd', 'employee-data'],
    department: 'Human Resources',
    avatarUrl: ''
  });
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check Supabase connection
    const checkConnection = async () => {
      try {
        const { error } = await supabase.from('company_employees').select('id').limit(1);
        if (error && error.message.includes('fetch')) {
          setDbConnected(false);
        } else {
          setDbConnected(true);
        }
      } catch (err) {
        setDbConnected(false);
      }
    };
    checkConnection();
  }, []);

  const navItems = [
    { label: 'HR Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Data Karyawan', path: '/employees', icon: Users },
    { label: 'Absensi & Presensi', path: '/attendance', icon: Clock },
    { label: 'Kalender Perusahaan', path: '/calendar', icon: Calendar },
    { label: 'Pengajuan & Cuti', path: '/requests', icon: FileText },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans">
      <Toaster position="top-right" richColors />

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card/80 backdrop-blur-xl transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-foreground">GESIT HRIS</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Human Resources</div>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Database Status Alert */}
        {dbConnected === false && (
          <div className="mx-3 mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] text-amber-500">
            <div className="flex items-center gap-1.5 font-semibold">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Database Setup</span>
            </div>
            <p className="mt-1 leading-relaxed opacity-90">
              Jalankan <code className="font-mono bg-black/20 px-1 py-0.5 rounded">hr_standalone_schema.sql</code> di Supabase baru & isi <code className="font-mono bg-black/20 px-1 py-0.5 rounded">.env</code>.
            </p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4">
          <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Core HR Modules
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/50 p-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 text-xs font-bold text-primary">
              HR
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-foreground">{currentUser.fullName}</div>
              <div className="truncate text-[10px] text-muted-foreground">{currentUser.email}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-card/50 px-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden sm:block">
              <h1 className="text-sm font-semibold text-foreground">
                {navItems.find((n) => n.path === location.pathname)?.label || 'HR Management Portal'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <div className="h-4 w-[1px] bg-border mx-1" />
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Dedicated HRIS</span>
            </div>
          </div>
        </header>

        {/* Content View */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<HRDashboard currentUser={currentUser} />} />
            <Route path="/employees" element={<EmployeeDataManager currentUser={currentUser} />} />
            <Route path="/attendance" element={<AttendanceManager currentUser={currentUser} />} />
            <Route path="/calendar" element={<AttendanceManager currentUser={currentUser} />} />
            <Route path="/requests" element={<AttendanceManager currentUser={currentUser} />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
