import React from 'react';
import { useLocation } from 'react-router-dom';
import { AttendanceDashboard } from './attendance/AttendanceDashboard';
import { AttendanceReport } from './attendance/AttendanceReport';
import { AttendanceCalendar } from './attendance/AttendanceCalendar';
import { AttendanceRadius } from './attendance/AttendanceRadius';
import { AttendanceRequest } from './attendance/AttendanceRequest';
import { SystemSettings } from './admin/SystemSettings';

export interface AttendanceManagerProps {
  currentUser?: any;
  section?: 'dashboard' | 'report' | 'calendar' | 'locations' | 'radius' | 'request' | 'settings' | string;
}

export const AttendanceManager: React.FC<AttendanceManagerProps> = ({ currentUser, section: sectionProp }) => {
  const location = useLocation();

  const section = sectionProp || (() => {
    const pathname = location.pathname.replace(/\/$/, '');
    if (pathname === '/attendance' || pathname === '') return 'report';
    if (pathname === '/attendance/report' || pathname === '/attendance-report') return 'report';
    if (pathname === '/attendance/calendar' || pathname === '/calendar' || pathname === '/attendance-calendar') return 'calendar';
    if (pathname === '/attendance/locations' || pathname === '/attendance/radius' || pathname === '/attendance-locations') return 'locations';
    if (pathname === '/requests') return 'request';
    if (pathname === '/settings' || pathname === '/admin/settings') return 'settings';
    return pathname.replace('/attendance-', '').replace('/attendance/', '') || 'report';
  })();

  switch (section) {
    case 'dashboard':
      return <AttendanceDashboard currentUser={currentUser} />;
    case 'calendar':
      return <AttendanceCalendar />;
    case 'locations':
    case 'radius':
      return <AttendanceRadius />;
    case 'request':
    case 'requests':
    case 'pengajuan':
      return <AttendanceRequest currentUser={currentUser} />;
    case 'settings':
      return <SystemSettings currentUser={currentUser} />;
    case 'report':
    default:
      return <AttendanceReport currentUser={currentUser} />;
  }
};

export { AttendanceDashboard, AttendanceReport, AttendanceCalendar, AttendanceRadius, AttendanceRequest };
export default AttendanceManager;
