import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../context/LanguageContext';
import { SidebarProvider, SidebarInset } from '../../components/ui/sidebar';
import { NexoraSidebar } from '../../components/nexora/layout/NexoraSidebar';
import { NexoraHeader } from '../../components/nexora/layout/NexoraHeader';
import { AttendanceReport } from '../../components/attendance/AttendanceReport';
import '../../index.css';

const user = { id: 'qa-manager', fullName: 'TEST HR', role: 'Super Admin', email: 'test@example.invalid' };

function ReportPreview() {
  const [isDark, setIsDark] = React.useState(false);
  return (
    <SidebarProvider className="h-screen w-screen overflow-hidden bg-[#F8FAFC] dark:bg-[#09090B]">
      <NexoraSidebar currentUser={user} isHR canView={() => true} onLogout={() => {}} />
      <SidebarInset className="overflow-hidden flex flex-col min-w-0 bg-[#F8FAFC] dark:bg-[#09090B]">
        <NexoraHeader
          currentUser={user}
          breadcrumbLabel="Absensi / Report"
          onSearchClick={() => {}}
          isDark={isDark}
          onToggleTheme={() => {
            setIsDark(!isDark);
            document.documentElement.classList.toggle('dark');
          }}
          onLogout={() => {}}
        />
        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7">
          <AttendanceReport currentUser={user} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <MemoryRouter initialEntries={['/attendance/report']}>
    <LanguageProvider><ReportPreview /></LanguageProvider>
  </MemoryRouter>,
);
