// Supabase project configuration
window.SUPABASE_URL = 'https://woadwlsanojvqfxtygqw.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_7JILwGREbyd4yOEjIktTpg_33sKyLfL';

// Create one Supabase client for the app
window.supabaseClient = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

// Support older app files that use `supabase.from(...)`
window.db = window.supabaseClient;
window.sb = window.supabaseClient;

// IMPORTANT:
// Some of your older app code may expect a variable named `supabase`.
// This line keeps that working.
var supabase = window.supabaseClient;
