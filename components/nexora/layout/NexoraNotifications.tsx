import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Calendar,
  FileText,
  Clock,
  ChevronRight,
  Check,
  CheckCircle2,
  AlertTriangle,
  Users,
  ShieldAlert,
} from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabaseClient';

export interface NexoraNotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  unread: boolean;
  type: 'leave' | 'contract' | 'system' | 'attendance';
  link?: string;
}

export function NexoraNotifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = React.useState<NexoraNotificationItem[]>([]);
  const [filter, setFilter] = React.useState<'all' | 'unread'>('all');
  const [loading, setLoading] = React.useState(true);

  // Fetch real notifications from Supabase
  const fetchNotifications = React.useCallback(async () => {
    try {
      setLoading(true);
      const items: NexoraNotificationItem[] = [];

      // 1. Pending leave requests
      const { data: leaves } = await supabase
        .from('leave_requests')
        .select('id, user_id, leave_type, reason, created_at, status')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

      if (leaves && leaves.length > 0) {
        // Fetch user names
        const userIds = leaves.map((l) => l.user_id).filter(Boolean);
        const { data: users } = await supabase
          .from('user_accounts')
          .select('id, full_name, company')
          .in('id', userIds);

        const userMap = new Map((users || []).map((u) => [String(u.id), u]));

        leaves.forEach((l) => {
          const emp = userMap.get(String(l.user_id));
          items.push({
            id: `leave-${l.id}`,
            title: `Pengajuan ${l.leave_type || 'Cuti'}`,
            description: `${emp?.full_name || 'Karyawan'} mengajukan ${l.leave_type}: "${l.reason || 'Mohon persetujuan'}"`,
            time: formatTimeAgo(l.created_at),
            unread: true,
            type: 'leave',
            link: '/requests',
          });
        });
      }

      // 2. Expiring contracts (< 30 days)
      const now = new Date();
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const todayStr = now.toISOString().slice(0, 10);

      const { data: expiringContracts } = await supabase
        .from('user_accounts')
        .select('id, full_name, contract_end_date, employment_status')
        .eq('employment_status', 'PKWT')
        .lte('contract_end_date', in30Days)
        .gte('contract_end_date', todayStr)
        .limit(3);

      if (expiringContracts && expiringContracts.length > 0) {
        expiringContracts.forEach((c) => {
          items.push({
            id: `contract-${c.id}`,
            title: 'Kontrak PKWT Segera Berakhir',
            description: `Kontrak kerja ${c.full_name} berakhir pada ${c.contract_end_date}.`,
            time: 'Perhatian HR',
            unread: true,
            type: 'contract',
            link: '/employees',
          });
        });
      }

      // 3. Fallback mock / system notice if quiet
      if (items.length === 0) {
        items.push({
          id: 'system-online',
          title: 'Sistem HCM Berjalan Tertib',
          description: 'Tidak ada antrean persetujuan atau kontrak mendesak yang membutuhkan tindakan saat ini.',
          time: 'Baru saja',
          unread: false,
          type: 'system',
          link: '/',
        });
      }

      setNotifications(items);
    } catch (err) {
      console.warn('Gagal memuat notifikasi:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => n.unread).length;
  const filteredNotifications = filter === 'unread' ? notifications.filter((n) => n.unread) : notifications;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const markOneRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
  };

  const getItemIcon = (type: NexoraNotificationItem['type']) => {
    switch (type) {
      case 'leave':
        return <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case 'contract':
        return <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
      case 'attendance':
        return <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      default:
        return <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative h-8.5 w-8.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white cursor-pointer"
            title="Pusat Notifikasi & Approval"
          />
        }
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 ring-2 ring-white dark:ring-[#0c0c0e]" />
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="w-80 sm:w-96 p-0 shadow-2xl rounded-2xl bg-white dark:bg-[#18181b] border border-slate-200/80 dark:border-[#27272a] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 dark:text-white">Pemberitahuan</span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-4.5 px-1.5 text-[10px] font-bold">
                {unreadCount} baru
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Tandai dibaca
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 p-1.5 bg-slate-50/60 dark:bg-zinc-900/60 border-b border-slate-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filter === 'all'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900'
            }`}
          >
            Semua ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filter === 'unread'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900'
            }`}
          >
            Belum Dibaca ({unreadCount})
          </button>
        </div>

        {/* List items */}
        <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/60">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 dark:text-zinc-500">
              Tidak ada notifikasi saat ini
            </div>
          ) : (
            filteredNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  if (n.link) navigate(n.link);
                }}
                className={`flex items-start gap-3 p-3.5 hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer ${
                  n.unread ? 'bg-blue-50/30 dark:bg-blue-950/10' : ''
                }`}
              >
                <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                  {getItemIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{n.title}</p>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 shrink-0">{n.time}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-zinc-300 line-clamp-2 mt-0.5 leading-snug">
                    {n.description}
                  </p>
                </div>
                {n.unread && (
                  <button
                    type="button"
                    title="Tandai sudah dibaca"
                    onClick={(e) => markOneRead(n.id, e)}
                    className="h-5 w-5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-700 flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
          <button
            type="button"
            onClick={() => navigate('/requests')}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
          >
            <span>Buka Antrean Approval</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function formatTimeAgo(dateString?: string): string {
  if (!dateString) return 'Baru saja';
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Baru saja';
  if (mins < 60) return `${mins}m lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}j lalu`;
  const days = Math.floor(hours / 24);
  return `${days}h lalu`;
}
