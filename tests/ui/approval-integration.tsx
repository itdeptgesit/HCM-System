import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AttendanceRequest } from '../../components/attendance/AttendanceRequest';
import { SidebarProvider, SidebarInset } from '../../components/ui/sidebar';
import { NexoraSidebar } from '../../components/nexora/layout/NexoraSidebar';
import { NexoraHeader } from '../../components/nexora/layout/NexoraHeader';
import { GlobalSearchDialog } from '../../components/GlobalSearchDialog';
import { ToastProvider } from '../../components/ToastProvider';
import { TooltipProvider } from '../../components/ui/tooltip';
import '../../index.css';

const mockUser = {
  id: 1,
  fullName: 'Rudi Siarudin',
  email: 'rudi.siarudin@gesit.co.id',
  role: 'Super Admin',
  jobTitle: 'IT Specialist / HCM Admin',
  company: 'The Gesit Companies'
};

function FullApprovalIntegration() {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [isDark, setIsDark] = React.useState(false);

  return (
    <TooltipProvider>
      <ToastProvider>
        <SidebarProvider className="h-screen w-screen overflow-hidden bg-[#F8FAFC] dark:bg-[#09090B] text-slate-900 dark:text-zinc-100 font-sans selection:bg-[#12346a]/15 selection:text-[#12346a]">
          <NexoraSidebar
            currentUser={mockUser}
            isHR={true}
            canView={() => true}
            onLogout={() => {}}
          />
          <SidebarInset className="overflow-hidden flex flex-col min-w-0 bg-[#F8FAFC] dark:bg-[#09090B]">
            <NexoraHeader
              currentUser={mockUser}
              breadcrumbLabel="Pengajuan & Approval"
              onSearchClick={() => setSearchOpen(true)}
              isDark={isDark}
              onToggleTheme={() => {
                setIsDark(!isDark);
                document.documentElement.classList.toggle('dark');
              }}
              onLogout={() => {}}
            />
            <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7">
              <AttendanceRequest currentUser={mockUser} />
            </main>
          </SidebarInset>
          <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
        </SidebarProvider>
      </ToastProvider>
    </TooltipProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <MemoryRouter initialEntries={['/requests']}>
    <FullApprovalIntegration />
  </MemoryRouter>
);
