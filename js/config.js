// ── TEST / STAGING ENVIRONMENT CONFIG ──────────────────────────────────────
// This is the TEST branch. Uses a separate Supabase project from production.

window.SUPABASE_URL = 'https://qhqhqhqkgwlhuuloymvz.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_wmcAB6XXnpESJbo6Z6bp7Q_4lU8iRmq';

window.supabaseClient = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

window.db = window.supabaseClient;
window.sb = window.supabaseClient;
var supabase = window.supabaseClient;
