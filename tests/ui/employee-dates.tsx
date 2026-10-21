import React from 'react';
import { createRoot } from 'react-dom/client';
import { UserFormModal } from '../../components/UserFormModal';
import { ToastProvider } from '../../components/ToastProvider';
import type { UserAccount } from '../../types';
import '../../index.css';

const employee: UserAccount = {
  id: 'test-dates', fullName: 'TEST Dates', username: 'test-dates', email: 'dates@example.invalid',
  role: 'Employee', groups: ['employee'], status: 'Active',
  company: 'TEST Company', department: 'TEST IT',
  dateOfBirth: '2000-02-29', joinDate: '2026-10-01',
  contractType: 'Probation', contractStartDate: '2026-10-01', contractEndDate: '2027-01-04',
};

function Preview() {
  const [open, setOpen] = React.useState(true);
  const [saved, setSaved] = React.useState<Partial<UserAccount>>();
  return (
    <ToastProvider>
      <UserFormModal isOpen={open} onClose={() => setOpen(false)} initialData={employee} onSubmit={setSaved} />
      <output id="saved-employee" hidden>{saved ? JSON.stringify(saved) : ''}</output>
    </ToastProvider>
  );
}

createRoot(document.getElementById('root')!).render(<Preview />);
