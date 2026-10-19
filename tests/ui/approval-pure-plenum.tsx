import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AttendanceRequest } from '../../components/attendance/AttendanceRequest';
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

function PurePlenumApprovalPage() {
  return (
    <TooltipProvider>
      <ToastProvider>
        <div className="w-screen h-screen overflow-hidden m-0 p-0">
          <AttendanceRequest currentUser={mockUser} />
        </div>
      </ToastProvider>
    </TooltipProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <MemoryRouter initialEntries={['/requests']}>
    <PurePlenumApprovalPage />
  </MemoryRouter>
);
