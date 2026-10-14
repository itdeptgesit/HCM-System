export interface ModulePermission {
  module: string;
  category: 'Workspace' | 'Administration';
  view: boolean;
  create: boolean;
  edit: boolean;
  approve: boolean;
  delete: boolean;
}

export type PermissionAction = 'view' | 'create' | 'edit' | 'approve' | 'delete';

export const ALL_ROLES = ['Super Admin', 'Admin', 'HR Manager', 'HR Staff', 'Employee'] as const;
export type UserRole = typeof ALL_ROLES[number];

export const DEFAULT_PERMISSIONS: Record<string, ModulePermission[]> = {
  'Super Admin': [
    { module: 'Dashboard & KPI', category: 'Workspace', view: true, create: true, edit: true, approve: true, delete: true },
    { module: 'Data Karyawan', category: 'Workspace', view: true, create: true, edit: true, approve: true, delete: true },
    { module: 'Absensi & Presensi', category: 'Workspace', view: true, create: true, edit: true, approve: true, delete: true },
    { module: 'Cuti & Izin', category: 'Workspace', view: true, create: true, edit: true, approve: true, delete: true },
    // Payroll & Gaji dinonaktifkan sementara
    // Rekrutmen dinonaktifkan sementara
    { module: 'Master Company', category: 'Administration', view: true, create: true, edit: true, approve: true, delete: true },
    { module: 'Master Department', category: 'Administration', view: true, create: true, edit: true, approve: true, delete: true },
    { module: 'Hierarchy Approval', category: 'Administration', view: true, create: true, edit: true, approve: true, delete: true },
    { module: 'Permission Menu', category: 'Administration', view: true, create: true, edit: true, approve: true, delete: true },
    { module: 'Account Management', category: 'Administration', view: true, create: true, edit: true, approve: true, delete: true },
    { module: 'Laporan & Analitik', category: 'Administration', view: true, create: true, edit: true, approve: true, delete: true },
    { module: 'Pengaturan Sistem', category: 'Administration', view: true, create: true, edit: true, approve: true, delete: true },
  ],
  'Admin': [
    { module: 'Dashboard & KPI', category: 'Workspace', view: true, create: true, edit: true, approve: true, delete: true },
    { module: 'Data Karyawan', category: 'Workspace', view: true, create: true, edit: true, approve: true, delete: true },
    { module: 'Absensi & Presensi', category: 'Workspace', view: true, create: true, edit: true, approve: true, delete: true },
    { module: 'Cuti & Izin', category: 'Workspace', view: true, create: true, edit: true, approve: true, delete: true },
    // Payroll & Gaji dinonaktifkan sementara
    // Rekrutmen dinonaktifkan sementara
    { module: 'Master Company', category: 'Administration', view: true, create: true, edit: true, approve: true, delete: false },
    { module: 'Master Department', category: 'Administration', view: true, create: true, edit: true, approve: true, delete: false },
    { module: 'Hierarchy Approval', category: 'Administration', view: true, create: true, edit: true, approve: true, delete: false },
    { module: 'Permission Menu', category: 'Administration', view: true, create: false, edit: false, approve: false, delete: false },
    { module: 'Account Management', category: 'Administration', view: true, create: true, edit: true, approve: true, delete: false },
    { module: 'Laporan & Analitik', category: 'Administration', view: true, create: true, edit: true, approve: true, delete: true },
    { module: 'Pengaturan Sistem', category: 'Administration', view: true, create: true, edit: true, approve: true, delete: false },
  ],
  'HR Manager': [
    { module: 'Dashboard & KPI', category: 'Workspace', view: true, create: true, edit: true, approve: true, delete: false },
    { module: 'Data Karyawan', category: 'Workspace', view: true, create: true, edit: true, approve: true, delete: false },
    { module: 'Absensi & Presensi', category: 'Workspace', view: true, create: true, edit: true, approve: true, delete: false },
    { module: 'Cuti & Izin', category: 'Workspace', view: true, create: true, edit: true, approve: true, delete: false },
    // Payroll & Gaji dinonaktifkan sementara
    // Rekrutmen dinonaktifkan sementara
    { module: 'Master Company', category: 'Administration', view: true, create: false, edit: false, approve: false, delete: false },
    { module: 'Master Department', category: 'Administration', view: true, create: true, edit: true, approve: false, delete: false },
    { module: 'Hierarchy Approval', category: 'Administration', view: true, create: true, edit: true, approve: false, delete: false },
    { module: 'Permission Menu', category: 'Administration', view: false, create: false, edit: false, approve: false, delete: false },
    { module: 'Account Management', category: 'Administration', view: true, create: true, edit: true, approve: false, delete: false },
    { module: 'Laporan & Analitik', category: 'Administration', view: true, create: true, edit: true, approve: false, delete: false },
    { module: 'Pengaturan Sistem', category: 'Administration', view: true, create: true, edit: true, approve: false, delete: false },
  ],
  'HR Staff': [
    { module: 'Dashboard & KPI', category: 'Workspace', view: true, create: false, edit: false, approve: false, delete: false },
    { module: 'Data Karyawan', category: 'Workspace', view: true, create: true, edit: true, approve: false, delete: false },
    { module: 'Absensi & Presensi', category: 'Workspace', view: true, create: true, edit: true, approve: false, delete: false },
    { module: 'Cuti & Izin', category: 'Workspace', view: true, create: true, edit: false, approve: false, delete: false },
    // Payroll & Gaji dinonaktifkan sementara
    // Rekrutmen dinonaktifkan sementara
    { module: 'Master Company', category: 'Administration', view: true, create: false, edit: false, approve: false, delete: false },
    { module: 'Master Department', category: 'Administration', view: true, create: false, edit: false, approve: false, delete: false },
    { module: 'Hierarchy Approval', category: 'Administration', view: false, create: false, edit: false, approve: false, delete: false },
    { module: 'Permission Menu', category: 'Administration', view: false, create: false, edit: false, approve: false, delete: false },
    { module: 'Account Management', category: 'Administration', view: false, create: false, edit: false, approve: false, delete: false },
    { module: 'Laporan & Analitik', category: 'Administration', view: true, create: false, edit: false, approve: false, delete: false },
    { module: 'Pengaturan Sistem', category: 'Administration', view: false, create: false, edit: false, approve: false, delete: false },
  ],
  'Employee': [
    { module: 'Dashboard & KPI', category: 'Workspace', view: true, create: false, edit: false, approve: false, delete: false },
    { module: 'Data Karyawan', category: 'Workspace', view: false, create: false, edit: false, approve: false, delete: false },
    { module: 'Absensi & Presensi', category: 'Workspace', view: true, create: true, edit: false, approve: false, delete: false },
    { module: 'Cuti & Izin', category: 'Workspace', view: true, create: true, edit: false, approve: false, delete: false },
    // Payroll & Gaji dinonaktifkan sementara
    // Rekrutmen dinonaktifkan sementara
    { module: 'Master Company', category: 'Administration', view: false, create: false, edit: false, approve: false, delete: false },
    { module: 'Master Department', category: 'Administration', view: false, create: false, edit: false, approve: false, delete: false },
    { module: 'Hierarchy Approval', category: 'Administration', view: false, create: false, edit: false, approve: false, delete: false },
    { module: 'Permission Menu', category: 'Administration', view: false, create: false, edit: false, approve: false, delete: false },
    { module: 'Account Management', category: 'Administration', view: false, create: false, edit: false, approve: false, delete: false },
    { module: 'Laporan & Analitik', category: 'Administration', view: false, create: false, edit: false, approve: false, delete: false },
    { module: 'Pengaturan Sistem', category: 'Administration', view: false, create: false, edit: false, approve: false, delete: false },
  ]
};

export const STORAGE_KEY = 'gesit_role_permissions';
export const PERMISSION_CHANGED_EVENT = 'gesit_permissions_changed';

export function getAllPermissions(): Record<string, ModulePermission[]> {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      const merged: Record<string, ModulePermission[]> = { ...DEFAULT_PERMISSIONS };
      for (const r of Object.keys(parsed)) {
        if (Array.isArray(parsed[r]) && parsed[r].length > 0) {
          merged[r] = parsed[r].filter((p: ModulePermission) => p.module !== 'Payroll & Gaji' && p.module !== 'Rekrutmen');
        }
      }
      return merged;
    }
  } catch (e) {
    console.warn('Error reading role permissions from storage:', e);
  }
  return { ...DEFAULT_PERMISSIONS };
}

export function saveAllPermissions(perms: Record<string, ModulePermission[]>): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(perms));
      window.dispatchEvent(new Event(PERMISSION_CHANGED_EVENT));
    }
  } catch (e) {
    console.error('Failed to save permissions:', e);
  }
}

export function resetRolePermissions(role: string): Record<string, ModulePermission[]> {
  const current = getAllPermissions();
  if (DEFAULT_PERMISSIONS[role]) {
    current[role] = JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS[role]));
    saveAllPermissions(current);
  }
  return current;
}

export function hasPermission(
  role: string | undefined | null,
  moduleName: string,
  action: PermissionAction = 'view'
): boolean {
  const normalizedRole = (role || 'Employee').trim();
  
  // Super Admin selalu memiliki akses penuh ke seluruh modul
  if (normalizedRole.toLowerCase() === 'super admin') {
    return true;
  }

  const allPerms = getAllPermissions();
  // Lookup case-insensitive
  const targetKey = Object.keys(allPerms).find(
    k => k.toLowerCase() === normalizedRole.toLowerCase()
  );
  const roleList = targetKey ? allPerms[targetKey] : [];
  
  const item = roleList.find(
    p => p.module.toLowerCase() === moduleName.toLowerCase() ||
         p.module.toLowerCase().includes(moduleName.toLowerCase()) ||
         moduleName.toLowerCase().includes(p.module.toLowerCase())
  );

  if (item) {
    return Boolean(item[action]);
  }

  // Fallback defaults jika modul baru
  if (normalizedRole.toLowerCase() === 'admin') return true;
  if (normalizedRole.toLowerCase() === 'hr manager') return action !== 'delete';
  return false;
}
