import React from 'react';
import { createRoot } from 'react-dom/client';
import { UserFormModal } from '../../components/UserFormModal';
import { ToastProvider } from '../../components/ToastProvider';
import { UserAccount } from '../../types';
import { UserProfilePage } from '../../components/profile/UserProfilePage';
import '../../index.css';

function Preview() {
  const [open, setOpen] = React.useState(true);
  const user = React.useMemo((): UserAccount => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 600;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#e04040';
    context.fillRect(0, 0, 600, 600);
    context.fillStyle = '#3050d0';
    context.fillRect(600, 0, 600, 600);
    return {
      id: 'test', fullName: 'TEST Employee', username: 'test', email: 'test@example.invalid',
      role: 'Employee', groups: ['employee'], status: 'Active',
      company: 'TEST Company', department: 'TEST IT',
      avatarUrl: new URLSearchParams(location.search).has('remote') ? `https://drive.google.com/file/d/${new URLSearchParams(location.search).get('remote') || 'TEST_FILE_ID'}/view` : canvas.toDataURL('image/png'),
    };
  }, []);
  return <ToastProvider>{new URLSearchParams(location.search).has('profile')
    ? <UserProfilePage currentUser={user} />
    : <UserFormModal isOpen={open} onClose={() => setOpen(false)} initialData={user} onSubmit={() => {}} />}</ToastProvider>;
}
createRoot(document.getElementById('root')!).render(<Preview />);
