import { supabase } from '../supabase.js';
export async function requireAuth(options = {}) {
  const { data, error } = await supabase.auth.getSession();
  const isLogged = !error && !!data.session;
  // Caso pagina login:
  // se l'utente è già autenticato, vai alla dashboard
  if (options.redirectIfLogged && isLogged) {
    window.location.href = "dashboard.html";
    return true;
  }
  // Caso pagine protette:
  // se l'utente NON è autenticato, vai al login
  if (!options.allowGuest && !isLogged) {
    window.location.href = "login.html";
    return false;
  }
  return isLogged;
}
