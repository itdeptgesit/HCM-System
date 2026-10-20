import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import LiveHRDashboard from '../../components/hr/LiveHRDashboard';
import { SidebarProvider, SidebarInset } from '../../components/ui/sidebar';
import { NexoraSidebar } from '../../components/nexora/layout/NexoraSidebar';
import { NexoraHeader } from '../../components/nexora/layout/NexoraHeader';
import { GlobalSearchDialog } from '../../components/GlobalSearchDialog';
import { LanguageProvider } from '../../context/LanguageContext';
import { Toaster } from 'sonner';
import '../../index.css';

const mockUser = {
  fullName: 'Rudi Siarudin',
  email: 'rudi.siarudin@gesit.co.id',
  role: 'Super Admin',
  jobTitle: 'IT Specialist / HCM Admin',
  company: 'The Gesit Companies'
};

function FullDashboardIntegration() {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [isDark, setIsDark] = React.useState(false);

  return (
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
          breadcrumbLabel="Dashboard Human Capital"
          onSearchClick={() => setSearchOpen(true)}
          isDark={isDark}
          onToggleTheme={() => {
            setIsDark(!isDark);
            document.documentElement.classList.toggle('dark');
          }}
          onLogout={() => {}}
        />
        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7">
          <LiveHRDashboard currentUser={mockUser} />
        </main>
      </SidebarInset>
      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </SidebarProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <MemoryRouter initialEntries={['/']}>
    <LanguageProvider>
      <FullDashboardIntegration />
      <Toaster />
    </LanguageProvider>
  </MemoryRouter>
);
