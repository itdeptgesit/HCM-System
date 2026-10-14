import { supabase } from './supabaseClient';

export interface AuditLogItem {
  id: number;
  user_id?: number | null;
  user_name: string;
  user_role: string;
  user_email?: string;
  module: string;
  action: string;
  details: string;
  metadata?: any;
  created_at: string;
}

export interface TrackActivityPayload {
  userId?: number | string | null;
  userName?: string;
  userRole?: string;
  userEmail?: string;
  module: string;
  action: string;
  details?: string;
  metadata?: any;
}

/**
 * Log user activity into user_activity_logs table in Supabase.
 * Supports both object payload and positional arguments for backwards compatibility.
 */
export const trackActivity = async (
  userNameOrPayload: string | TrackActivityPayload,
  userRole?: string,
  action?: string,
  module?: string,
  details?: string,
  userId?: number | string | null
) => {
  try {
    const payload = {
      userId: null as number | null,
      userName: 'Pengguna Sistem',
      userRole: 'Employee',
      userEmail: '',
      module: 'Sistem',
      action: 'ACTIVITY',
      details: '',
      metadata: null as any
    };

    if (typeof userNameOrPayload === 'object' && userNameOrPayload !== null) {
      if (userNameOrPayload.userId) payload.userId = Number(userNameOrPayload.userId);
      if (userNameOrPayload.userName) payload.userName = userNameOrPayload.userName;
      if (userNameOrPayload.userRole) payload.userRole = userNameOrPayload.userRole;
      if (userNameOrPayload.userEmail) payload.userEmail = userNameOrPayload.userEmail;
      if (userNameOrPayload.module) payload.module = userNameOrPayload.module;
      if (userNameOrPayload.action) payload.action = userNameOrPayload.action;
      if (userNameOrPayload.details) payload.details = userNameOrPayload.details;
      if (userNameOrPayload.metadata) payload.metadata = userNameOrPayload.metadata;
    } else {
      payload.userName = String(userNameOrPayload || 'Pengguna Sistem');
      payload.userRole = String(userRole || 'Employee');
      payload.action = String(action || 'ACTIVITY');
      payload.module = String(module || 'Sistem');
      payload.details = String(details || '');
      payload.userId = userId ? Number(userId) : null;
    }

    const detailsJson = JSON.stringify({
      module: payload.module,
      userName: payload.userName,
      userRole: payload.userRole,
      userEmail: payload.userEmail,
      details: payload.details,
      metadata: payload.metadata
    });

    const { error } = await supabase
      .from('user_activity_logs')
      .insert([
        {
          user_id: payload.userId,
          action: payload.action,
          details: detailsJson,
          created_at: new Date().toISOString()
        }
      ]);

    if (error) {
      console.warn('Activity logging warning:', error.message);
    }
  } catch (err) {
    console.warn('Failed to track activity:', err);
  }
};

/**
 * Fetch and parse activity logs from database
 */
export const fetchActivityLogs = async (limit: number = 250): Promise<AuditLogItem[]> => {
  try {
    const { data, error } = await supabase
      .from('user_activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching activity logs:', error);
      return [];
    }

    if (!data) return [];

    return data.map((row: any) => {
      let parsed: any = {};
      try {
        if (typeof row.details === 'string' && row.details.startsWith('{')) {
          parsed = JSON.parse(row.details);
        }
      } catch (_) {
        parsed = {};
      }

      return {
        id: row.id,
        user_id: row.user_id,
        user_name: parsed.userName || row.user_name || 'System User',
        user_role: parsed.userRole || row.user_role || 'Employee',
        user_email: parsed.userEmail || '',
        module: parsed.module || row.module || 'Umum',
        action: row.action || 'ACTIVITY',
        details: parsed.details || (typeof row.details === 'string' ? row.details : '—') || '—',
        metadata: parsed.metadata || null,
        created_at: row.created_at
      };
    });
  } catch (err) {
    console.error('Fetch activity logs error:', err);
    return [];
  }
};
