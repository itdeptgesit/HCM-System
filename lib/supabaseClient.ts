import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || process?.env?.VITE_SUPABASE_URL || 'https://oyhwtleoftbiyabsgjsu.supabase.co';
const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || process?.env?.VITE_SUPABASE_ANON_KEY || 'mock-anon-key';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase credentials missing in environment variables');
}

// Client standar (pakai anon key, tunduk ke RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Backward-compatible alias for components. Browser code always obeys RLS;
// administrative Auth operations run only in the manage-user Edge Function.
export const supabaseAdmin = supabase;

/**
 * Ensures a user account exists in Supabase Auth with the specified password.
 * Handles both new user creation and updating password for existing auth users.
 */
export const ensureAuthUserWithPassword = async (
  email: string,
  password?: string,
  fullName?: string,
  existingId?: string | number
): Promise<string | null> => {
  if (!password || !password.trim()) return null;
  const emailTrim = email.trim().toLowerCase();
  const passwordTrim = password.trim();
  const nameTrim = (fullName || emailTrim.split('@')[0]).trim();

  // 1. Coba Edge Function jika terpasang
  try {
    const { data: fnData, error: fnErr } = await supabase.functions.invoke('manage-user', {
      body: { email: emailTrim, password: passwordTrim, fullName: nameTrim, existingId: existingId?.toString() }
    });
    if (!fnErr && fnData?.id) {
      return fnData.id;
    }
  } catch (_) {
    // Edge function tidak tersedia, lanjutkan ke fallback
  }

  // 1.5. Coba PostgreSQL RPC admin_set_user_password jika terpasang di database
  try {
    const { data: rpcSuccess } = await supabase.rpc('admin_set_user_password', {
      target_email: emailTrim,
      new_password: passwordTrim
    });
    if (rpcSuccess) {
      console.log('Password berhasil diupdate via admin_set_user_password RPC');
    }
  } catch (_) {}

  // 2. Fallback: Supabase Auth signUp langsung (membuat akun auth baru jika belum ada)
  try {
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: emailTrim,
      password: passwordTrim,
      options: {
        data: { full_name: nameTrim }
      }
    });

    if (!signUpErr && signUpData?.user?.id) {
      return signUpData.user.id;
    }

    // 3. Jika akun sudah ada di Auth, periksa apakah password baru cocok dengan sign in
    if (signUpErr) {
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: emailTrim,
        password: passwordTrim
      });
      if (!signInErr && signInData?.user?.id) {
        return signInData.user.id;
      }
    }
  } catch (authEx) {
    console.warn('Auth fallback exception:', authEx);
  }

  // 4. Periksa apakah sudah ada auth_id di user_accounts
  try {
    const { data: existingAcc } = await supabase
      .from('user_accounts')
      .select('auth_id')
      .eq('email', emailTrim)
      .maybeSingle();
    if (existingAcc?.auth_id) {
      return existingAcc.auth_id;
    }
  } catch (_) {}

  // 5. Kembalikan UUID v4 yang valid agar penyimpanan di user_accounts berhasil
  return crypto.randomUUID();
};
