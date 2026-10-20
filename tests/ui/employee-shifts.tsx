import React from 'react';
import { createRoot } from 'react-dom/client';
import { UserFormModal } from '../../components/UserFormModal';
import { ToastProvider } from '../../components/ToastProvider';
import { UserAccount } from '../../types';
import '../../index.css';

function Preview() {
  const [open, setOpen] = React.useState(true);
  const [saved, setSaved] = React.useState<Partial<UserAccount> | null>(null);
  const initialData: UserAccount = React.useMemo(() => ({
    id: 'test', fullName: 'TEST Karyawan', username: 'test', email: 'test@example.invalid',
    role: 'Employee', groups: ['employee'], status: 'Active',
    company: 'TEST Perusahaan', department: 'TEST IT',
    contractType: 'PKWTT', employmentType: 'PKWTT', workScheduleType: 'shift',
    scheduleId: new URLSearchParams(location.search).has('legacy') ? '2' : '',
  }), []);
  return (
    <ToastProvider>
      <UserFormModal isOpen={open} onClose={() => setOpen(false)} initialData={initialData} onSubmit={value => setSaved(value)} />
      <output data-testid="saved">{JSON.stringify(saved)}</output>
    </ToastProvider>
  );
}
createRoot(document.getElementById('root')!).render(<Preview />);
