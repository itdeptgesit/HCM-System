import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Check, 
  X, 
  Save, 
  RotateCcw, 
  Users, 
  Eye, 
  PlusCircle, 
  Edit, 
  Trash2, 
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { useToast } from '../ToastProvider';
import {
  ModulePermission,
  DEFAULT_PERMISSIONS,
  ALL_ROLES,
  getAllPermissions,
  saveAllPermissions,
  resetRolePermissions
} from '../../lib/permissions';
import { trackActivity } from '../../lib/auditLogger';

export const PermissionMenu: React.FC<{ currentUser?: any }> = ({ currentUser }) => {
  const { showToast } = useToast();
  const [selectedRole, setSelectedRole] = useState<string>('Super Admin');
  const [permissions, setPermissions] = useState<Record<string, ModulePermission[]>>(() => getAllPermissions());
  const [hasChanges, setHasChanges] = useState(false);

  const roles = [...ALL_ROLES];

  // Refresh permissions on mount or when storage updates
  useEffect(() => {
    setPermissions(getAllPermissions());
  }, []);

  const handleToggle = (moduleName: string, action: keyof Omit<ModulePermission, 'module' | 'category'>) => {
    setPermissions(prev => {
      const currentRolePerms = prev[selectedRole] || DEFAULT_PERMISSIONS[selectedRole] || [];
      const updated = currentRolePerms.map(item => {
        if (item.module === moduleName) {
          return { ...item, [action]: !item[action] };
        }
        return item;
      });
      return { ...prev, [selectedRole]: updated };
    });
    setHasChanges(true);
  };

  const handleSave = () => {
    saveAllPermissions(permissions);
    setHasChanges(false);
    showToast(`Matriks hak akses untuk peran "${selectedRole}" berhasil disimpan & langsung aktif di aplikasi!`, 'success');

    trackActivity({
      userId: currentUser?.id,
      userName: currentUser?.fullName || currentUser?.name || 'Administrator',
      userRole: currentUser?.role || 'Super Admin',
      userEmail: currentUser?.email,
      module: 'Permission Menu',
      action: 'UPDATE_PERMISSIONS',
      details: `Memperbarui matriks hak akses modul untuk peran "${selectedRole}"`,
      metadata: {
        role: selectedRole,
        permissionsCount: permissions[selectedRole]?.length
      }
    }).catch(console.error);
  };

  const handleReset = () => {
    const updated = resetRolePermissions(selectedRole);
    setPermissions(updated);
    setHasChanges(false);
    showToast(`Hak akses peran "${selectedRole}" berhasil dikembalikan ke standar awal.`, 'info');

    trackActivity({
      userId: currentUser?.id,
      userName: currentUser?.fullName || currentUser?.name || 'Administrator',
      userRole: currentUser?.role || 'Super Admin',
      userEmail: currentUser?.email,
      module: 'Permission Menu',
      action: 'RESET_PERMISSIONS',
      details: `Mengembalikan hak akses peran "${selectedRole}" ke pengaturan default pabrik`,
      metadata: { role: selectedRole }
    }).catch(console.error);
  };

  const currentRoleList = permissions[selectedRole] || DEFAULT_PERMISSIONS[selectedRole] || [];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Keamanan & Hak Akses
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
            <Lock className="h-7 w-7 text-primary" />
            Permission Menu
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Atur matriks otorisasi dan kontrol akses modul untuk setiap peran pengguna dalam aplikasi.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted/60 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Default</span>
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>Simpan Perubahan</span>
          </button>
        </div>
      </div>

      {/* Role Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-2xs">
        {roles.map((role) => (
          <button
            key={role}
            onClick={() => setSelectedRole(role)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              selectedRole === role
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            }`}
          >
            {role}
          </button>
        ))}
      </div>

      {/* Permissions Table Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs">
        <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Matriks Otorisasi: <span className="text-[#B38241] dark:text-amber-400">{selectedRole}</span>
            </h3>
            <p className="text-xs text-muted-foreground">Centang untuk memberikan hak istimewa pada menu dan modul terkait.</p>
          </div>
          {hasChanges && (
            <span className="rounded-md bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
              Ada perubahan belum disimpan
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 font-semibold">Modul / Menu</th>
                <th className="pb-3 font-semibold">Kategori</th>
                <th className="pb-3 font-semibold text-center">Lihat (View)</th>
                <th className="pb-3 font-semibold text-center">Buat (Create)</th>
                <th className="pb-3 font-semibold text-center">Ubah (Edit)</th>
                <th className="pb-3 font-semibold text-center">Setujui (Approve)</th>
                <th className="pb-3 font-semibold text-center">Hapus (Delete)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {currentRoleList.map((item) => (
                <tr key={item.module} className="hover:bg-muted/40 transition-colors">
                  <td className="py-3.5 font-bold text-foreground">
                    {item.module}
                  </td>
                  <td className="py-3.5">
                    <span className="rounded-md bg-muted/60 border border-border/50 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {item.category}
                    </span>
                  </td>
                  
                  {/* View */}
                  <td className="py-3.5 text-center">
                    <input
                      type="checkbox"
                      checked={item.view}
                      onChange={() => handleToggle(item.module, 'view')}
                      className="h-4 w-4 rounded-md border-input bg-background text-primary accent-primary cursor-pointer"
                    />
                  </td>

                  {/* Create */}
                  <td className="py-3.5 text-center">
                    <input
                      type="checkbox"
                      checked={item.create}
                      onChange={() => handleToggle(item.module, 'create')}
                      className="h-4 w-4 rounded-md border-input bg-background text-primary accent-primary cursor-pointer"
                    />
                  </td>

                  {/* Edit */}
                  <td className="py-3.5 text-center">
                    <input
                      type="checkbox"
                      checked={item.edit}
                      onChange={() => handleToggle(item.module, 'edit')}
                      className="h-4 w-4 rounded-md border-input bg-background text-primary accent-primary cursor-pointer"
                    />
                  </td>

                  {/* Approve */}
                  <td className="py-3.5 text-center">
                    <input
                      type="checkbox"
                      checked={item.approve}
                      onChange={() => handleToggle(item.module, 'approve')}
                      className="h-4 w-4 rounded-md border-input bg-background text-primary accent-primary cursor-pointer"
                    />
                  </td>

                  {/* Delete */}
                  <td className="py-3.5 text-center">
                    <input
                      type="checkbox"
                      checked={item.delete}
                      onChange={() => handleToggle(item.module, 'delete')}
                      className="h-4 w-4 rounded-md border-input bg-background text-rose-600 accent-rose-600 cursor-pointer"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PermissionMenu;
