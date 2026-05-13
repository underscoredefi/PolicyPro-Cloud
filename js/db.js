// ── DATA LAYER ────────────────────────────────────────────────────────────────
// In-memory cache — all reads are synchronous (from cache).
// Writes update cache immediately and fire async sync to Supabase in background.

const _cache = {
  prospects:   [],
  clients:     [],
  callers:     [],
  callhistory: [],
  pipeline:    [],
  tasks:       []
};

let _currentUserId = null;

// ── UID generator (same as original) ─────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ── Synchronous read from cache ───────────────────────────────────────────────
function ld(section) {
  return JSON.parse(JSON.stringify(_cache[section] || []));
}

// ── Synchronous write to cache + async cloud sync ─────────────────────────────
function sv(section, records) {
  _cache[section] = JSON.parse(JSON.stringify(records));
  if (_currentUserId) {
    _syncSection(section, records).catch(err => console.error('Cloud sync error:', err));
  }
}

// ── Call history helpers (same interface as original) ─────────────────────────
function ldCallHistory() {
  return ld('callhistory');
}
function svCallHistory(records) {
  sv('callhistory', records);
}

// ── Load all data from Supabase into cache ────────────────────────────────────
async function loadFromCloud() {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return false;

  _currentUserId = user.id;

  const { data, error } = await supabase
    .from('crm_data')
    .select('id, section, data')
    .eq('user_id', user.id);

  if (error) {
    console.error('Failed to load from cloud:', error);
    return false;
  }

  // Reset cache
  Object.keys(_cache).forEach(k => { _cache[k] = []; });

  (data || []).forEach(row => {
    if (_cache[row.section] !== undefined && row.data) {
      _cache[row.section].push(row.data);
    }
  });

  return true;
}

// ── Sync a section to Supabase ────────────────────────────────────────────────
// Upserts all records in the section, deletes any orphaned cloud rows.
async function _syncSection(section, records) {
  if (!_currentUserId) return;

  // Get all existing cloud row ids for this section
  const { data: existing } = await supabase
    .from('crm_data')
    .select('id')
    .eq('user_id', _currentUserId)
    .eq('section', section);

  const cloudIds  = new Set((existing || []).map(r => r.id));
  const localIds  = new Set(records.map(r => r.id));

  // Upsert all local records
  if (records.length > 0) {
    const rows = records.map(r => ({
      id:         r.id,
      user_id:    _currentUserId,
      section:    section,
      data:       r,
      updated_at: new Date().toISOString()
    }));
    const { error } = await supabase
      .from('crm_data')
      .upsert(rows, { onConflict: 'id' });
    if (error) console.error('Upsert error:', section, error);
  }

  // Delete cloud rows that no longer exist locally
  const toDelete = [...cloudIds].filter(id => !localIds.has(id));
  if (toDelete.length > 0) {
    await supabase
      .from('crm_data')
      .delete()
      .in('id', toDelete)
      .eq('user_id', _currentUserId);
  }
}

// ── Auth helpers ──────────────────────────────────────────────────────────────
async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  _currentUserId = data.user.id;
  return data.user;
}

async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

async function signOut() {
  await supabase.auth.signOut();
  _currentUserId = null;
  Object.keys(_cache).forEach(k => { _cache[k] = []; });
}

async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) _currentUserId = user.id;
  return user;
}
