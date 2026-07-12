import { supabase } from '../supabase.js';
export async function requireAuth() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}
