import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { HRTopNavigation, type HRNavigationItem } from '../../components/hr/HRTopNavigation';
import { Users } from '../../components/ui/icons';
import '../../index.css';

const items = (entries: [string, string][]): HRNavigationItem[] => entries.map(([label, path]) => ({ label, path, icon: Users }));
const params = new URLSearchParams(window.location.search);
const restricted = params.has('restricted');

function NavigationFixture() {
  const { pathname } = useLocation();
  return (
    <>
      <HRTopNavigation
        primary={restricted ? [] : items([['Dashboard', '/'], ['Data Karyawan', '/employees']])}
        secondary={items(restricted ? [['Request & Approval', '/requests']] : [['Pengajuan & Approval', '/requests'], ['Catatan SP Karyawan', '/disciplinary'], ['News & Pengumuman', '/news']])}
        attendance={restricted ? [] : items([['Report', '/attendance/report'], ['Request Absen', '/attendance/requests'], ['Calendar', '/attendance/calendar'], ['Radius Office', '/attendance/locations']])}
        administration={restricted ? [] : items([['Master Company', '/admin/companies'], ['Master Department', '/admin/departments'], ['Hierarchy Approval', '/admin/approval-hierarchy'], ['Permission Menu', '/admin/permissions'], ['Account Management', '/admin/accounts'], ['Log Aktivitas', '/admin/activity-logs'], ['Laporan & Analitik', '/analytics'], ['Pengaturan', '/settings']])}
      />
      <main className="p-6 text-foreground"><h1 className="text-lg font-semibold">Pratinjau komponen navigasi HR</h1><output data-testid="route">{pathname}</output></main>
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <MemoryRouter initialEntries={[params.get('route') || '/']}><NavigationFixture /></MemoryRouter>,
);
